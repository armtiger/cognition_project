# OpsTool — internal-tools MVP

A working prototype that reproduces the **runtime behavior** of three internal
Retool apps for a Series C fintech: a KYC review queue, refunds dashboard, and
feature-flag admin panel. It also demonstrates the cross-cutting controls that
matter in regulated operations: server-enforced action permissions,
maker-checker rules, state machines, optimistic concurrency, and structured
audit logging.

This tests whether the company can custom-build these three applications. It
does **not** replicate Retool's broader internal-tools platform (connectors,
app authoring, environments, release management, hosting, and operations).

## What it demonstrates

| Area | Behavior |
|---|---|
| **KYC Review Queue** | Risk-sorted queue; no terminal decision without review; server-required attributed reasons; immutable notes |
| **Refunds Dashboard** | Requester cannot approve their own refund; amounts over $500 require a different admin; approval and execution are distinct permissions |
| **Feature Flags** | Independent dev/staging/prod toggles and rollout percentages; admin-only writes; production confirmation |
| **Audit Log** | Structured before/after records for mutations and actor-attributed permission/policy denials |
| **Policy page** | Read-only view of the exact version-controlled permission matrix, state machines, thresholds, and assumptions the API enforces |

Four demo personas are available through the **Signed in as** switcher:

- **Ana** — admin
- **Carlos** — compliance
- **Sam** — support
- **Vera** — viewer

The switcher stands in for SSO. Every rule is enforced by the API, not merely
by hiding UI controls.

## Run

Requires Node 24 LTS.

```bash
npm install
ALLOW_INSECURE_DEMO_AUTH=true npm run api
npm run web
```

Open http://localhost:5173.

The API binds to `127.0.0.1:4000`. It deliberately refuses to start unless
`ALLOW_INSECURE_DEMO_AUTH=true` is explicitly set because header auth and
SQLite fixtures are insecure local-demo shortcuts.

To reset the fixture data:

```bash
rm -f server/opstool.db*
```

## Automated checks

```bash
npm run build
npm run acceptance
```

The acceptance script resets the fixture DB, starts an isolated API, and
checks 21 behaviors including fail-closed boot, least privilege, direct-API
RBAC, KYC state transitions, server-side note validation, maker-checker,
admin threshold policy, stale-write rejection, flag validation, policy
round-tripping, and structured audit events.

## Demo walkthrough

1. **Policy** — show the assumptions banner, live thresholds, permission
   matrix, and state machines. Explain that these values are functional code
   in `server/policy/`, changed through a reviewed PR rather than a runtime
   admin backdoor.
2. **KYC as Carlos** — move a pending case to review and approve it. Reject or
   escalate another case to show the server-required, attributed reason.
3. **KYC as Sam** — controls are disabled. A direct API attempt also returns
   403 and writes `permission.denied`.
4. **Refunds as Sam** — try approving Sam's own `TXN-88231` to see
   `REQUESTER_CANNOT_APPROVE`; try the $1,299 request to see
   `ADMIN_APPROVAL_REQUIRED`.
5. **Refunds as Ana** — Ana still cannot approve her own $1,299 request, but
   can approve a different request over $500.
6. **Flags as Ana** — enable a production flag (confirmation required), then
   open **Audit Log** to show structured before/after values.
7. **Switch to Vera** — KYC, refunds, and audit are denied; flags and the
   read-only policy page remain available.

## Architecture

- [`ARCHITECTURE_SUMMARY.md`](ARCHITECTURE_SUMMARY.md) — one-page deliverable
  with the system diagram and key trade-offs.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — detailed implementation/build spec,
  assumptions, production gaps, and acceptance criteria.

The API uses domain adapters so SQLite represents fixture implementations of
what would be separate KYC, payments/refunds, feature-provider, and audit
systems in production. See the detailed architecture for the hardening path.

## Prototype limitations

Not production-safe: mock header auth, local SQLite, fake PII fixtures, no real
KYC/payment/feature-provider integration, no payment idempotency or
reconciliation, no SIEM export, and no deployment/monitoring/runbooks.
Feature-flag delivery remains the responsibility of a specialist provider.
