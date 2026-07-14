import { spawn, spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'opstool.db');
for (const suffix of ['', '-shm', '-wal']) {
  try { rmSync(`${dbPath}${suffix}`); } catch {}
}

let passed = 0;
function check(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
  console.log(`PASS ${passed}: ${message}`);
}

async function request(user, path, options = {}) {
  const res = await fetch(`http://127.0.0.1:4010/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user,
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch('http://127.0.0.1:4010/health');
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Server did not start');
}

// 1. Fail-closed process must exit nonzero without the explicit demo flag.
const closed = spawnSync(process.execPath, ['server/index.js'], {
  cwd: join(__dirname, '..'),
  env: { ...process.env, ALLOW_INSECURE_DEMO_AUTH: '' },
  encoding: 'utf8',
});
check(closed.status !== 0 && closed.stderr.includes('Refusing to start'), 'API fails closed without explicit insecure-demo flag');

const server = spawn(process.execPath, ['server/index.js'], {
  cwd: join(__dirname, '..'),
  env: { ...process.env, ALLOW_INSECURE_DEMO_AUTH: 'true', PORT: '4010' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stderr.on('data', (data) => process.stderr.write(data));

try {
  await waitForServer();

  // 2. Least privilege and server-side RBAC.
  let res = await request('u_vera', '/kyc');
  check(res.status === 403 && res.body.code === 'PERMISSION_DENIED', 'viewer cannot read KYC');
  res = await request('u_vera', '/refunds');
  check(res.status === 403, 'viewer cannot read refunds');
  res = await request('u_sam', '/kyc/kyc_1/decision', {
    method: 'POST', body: JSON.stringify({ status: 'in_review', version: 1 }),
  });
  check(res.status === 403, 'support cannot decide KYC via direct API call');

  // 3. State machine, note validation, and successful reviewed decision.
  res = await request('u_carlos', '/kyc/kyc_1/decision', {
    method: 'POST', body: JSON.stringify({ status: 'approved', version: 1 }),
  });
  check(res.status === 400 && res.body.code === 'ILLEGAL_TRANSITION', 'pending KYC cannot be approved directly');
  res = await request('u_carlos', '/kyc/kyc_6/decision', {
    method: 'POST', body: JSON.stringify({ status: 'escalated', version: 1 }),
  });
  check(res.status === 400 && res.body.code === 'NOTE_REQUIRED', 'escalation reason is enforced server-side');
  res = await request('u_carlos', '/kyc/kyc_1/decision', {
    method: 'POST', body: JSON.stringify({ status: 'in_review', version: 1 }),
  });
  check(res.status === 200, 'pending KYC can enter review');
  res = await request('u_carlos', '/kyc/kyc_1/decision', {
    method: 'POST', body: JSON.stringify({ status: 'approved', version: 2 }),
  });
  check(res.status === 200, 'reviewed KYC can be approved');
  res = await request('u_carlos', '/kyc/kyc_6/decision', {
    method: 'POST', body: JSON.stringify({ status: 'escalated', note: 'Manual second-line review required', version: 1 }),
  });
  check(res.status === 200, 'attributed KYC reason can be recorded');
  res = await request('u_carlos', '/kyc');
  const notedCase = res.body.cases.find((item) => item.id === 'kyc_6');
  check(notedCase.notes.at(-1)?.author === 'Carlos Diaz', 'KYC note is immutable and actor-attributed');

  // 4. Refund maker-checker and threshold policies.
  res = await request('u_sam', '/refunds/rf_1/approve', {
    method: 'POST', body: JSON.stringify({ decision: 'approved', version: 1 }),
  });
  check(res.status === 403 && res.body.code === 'REQUESTER_CANNOT_APPROVE', 'requester cannot approve own refund');
  res = await request('u_sam', '/refunds/rf_2/approve', {
    method: 'POST', body: JSON.stringify({ decision: 'approved', version: 1 }),
  });
  check(res.status === 403 && res.body.code === 'ADMIN_APPROVAL_REQUIRED', 'over-threshold refund requires admin');
  res = await request('u_ana', '/refunds/rf_2/approve', {
    method: 'POST', body: JSON.stringify({ decision: 'approved', version: 1 }),
  });
  check(res.status === 403 && res.body.code === 'REQUESTER_CANNOT_APPROVE', 'maker-checker also applies to admins');
  res = await request('u_ana', '/refunds/rf_4/approve', {
    method: 'POST', body: JSON.stringify({ decision: 'approved', version: 1 }),
  });
  check(res.status === 200, 'different admin can approve over-threshold refund');

  // 5. Flag validation, optimistic concurrency, and structured audit.
  res = await request('u_ana', '/flags');
  const flag = res.body.flags.find((item) => item.id === 'ff_1');
  res = await request('u_ana', '/flags/ff_1', {
    method: 'PATCH', body: JSON.stringify({ enabled_prod: true, version: flag.version }),
  });
  check(res.status === 200, 'admin can change production flag');
  res = await request('u_ana', '/flags/ff_1', {
    method: 'PATCH', body: JSON.stringify({ enabled_prod: false, version: flag.version }),
  });
  check(res.status === 409 && res.body.code === 'STALE_VERSION', 'stale mutation is rejected');
  res = await request('u_ana', '/flags');
  const changedFlag = res.body.flags.find((item) => item.id === 'ff_1');
  res = await request('u_ana', '/flags/ff_1', {
    method: 'PATCH', body: JSON.stringify({ rollout_pct_prod: 101, version: changedFlag.version }),
  });
  check(res.status === 400 && res.body.code === 'ROLLOUT_OUT_OF_RANGE', 'invalid rollout percentage is rejected, not clamped');

  // 6. Live policy round-trip and audit visibility.
  const policy = await request('u_vera', '/policy');
  const refunds = await request('u_ana', '/refunds');
  check(
    policy.body.thresholds.refundAdminApprovalCents === refunds.body.admin_threshold_cents,
    'Policy page and refund enforcement expose the same live threshold'
  );
  res = await request('u_vera', '/audit');
  check(res.status === 403, 'audit log is permission-gated');
  res = await request('u_ana', '/audit');
  const flagAudit = res.body.entries.find((entry) => entry.action === 'flag.update');
  check(
    flagAudit?.detail?.enabled_prod?.before === 0 && flagAudit?.detail?.enabled_prod?.after === 1,
    'flag audit stores structured before/after values'
  );
  check(
    res.body.entries.some((entry) => entry.action === 'permission.denied' && entry.outcome === 'denied'),
    'permission denials are audited'
  );

  console.log(`\nAll ${passed} acceptance checks passed.`);
} finally {
  server.kill('SIGTERM');
}
