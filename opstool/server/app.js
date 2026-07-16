import express from 'express';
import { db } from './infrastructure/sqlite/db.js';
import { authenticate } from './auth/authenticate.js';
import { requires, permissionsFor } from './authorization/requires.js';
import { recentAudit } from './audit/audit.js';
import { kycRouter } from './kyc/router.js';
import { refundsRouter } from './refunds/router.js';
import { flagsRouter } from './flags/router.js';
import {
  PERMISSIONS,
  REFUND_ADMIN_THRESHOLD_CENTS,
  KYC_HIGH_RISK_CUTOFF,
  KYC_TRANSITIONS,
  REFUND_TRANSITIONS,
} from './policy/index.js';
import { ASSUMPTIONS, BANNER } from './policy/assumptions.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  // Lightweight health route intentionally outside auth for local tooling.
  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api', authenticate);

  app.get('/api/users', (_req, res) => {
    const users = db.prepare('SELECT id, name, email, role FROM users ORDER BY rowid').all();
    res.json({ users });
  });

  app.get('/api/me', (req, res) => {
    res.json({ user: req.user, permissions: permissionsFor(req.user.role) });
  });

  app.get('/api/policy', requires('policy.read'), (_req, res) => {
    res.json({
      banner: BANNER,
      assumptions: ASSUMPTIONS,
      permissions: PERMISSIONS,
      thresholds: {
        refundAdminApprovalCents: REFUND_ADMIN_THRESHOLD_CENTS,
        kycHighRiskCutoff: KYC_HIGH_RISK_CUTOFF,
      },
      stateMachines: {
        kyc: KYC_TRANSITIONS,
        refunds: REFUND_TRANSITIONS,
      },
      editMode: 'config-as-code / reviewed PR',
    });
  });

  app.get('/api/audit', requires('audit.read'), (_req, res) => {
    res.json({ entries: recentAudit() });
  });

  app.use('/api/kyc', kycRouter);
  app.use('/api/refunds', refundsRouter);
  app.use('/api/flags', flagsRouter);

  // API error boundary.
  app.use((err, _req, res, _next) => {
    if (err?.status) {
      return res.status(err.status).json({ error: err.message, code: err.code ?? undefined });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });

  return app;
}
