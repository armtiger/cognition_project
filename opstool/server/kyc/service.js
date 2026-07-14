import { kycAdapter } from './adapter.js';
import { tx } from '../infrastructure/sqlite/db.js';
import { audit } from '../audit/audit.js';
import { badRequest, notFound, conflict } from '../infrastructure/errors.js';
import {
  KYC_HIGH_RISK_CUTOFF,
  KYC_NOTE_REQUIRED,
  KYC_TERMINAL,
  kycTransitionAllowed,
} from '../policy/index.js';

const ORDER = { escalated: 0, pending: 1, in_review: 2, approved: 3, rejected: 4 };

export function listCases() {
  const cases = kycAdapter.list().map((c) => ({
    id: c.id,
    customerName: c.customer_name,
    customerEmail: c.customer_email,
    country: c.country,
    documentType: c.document_type,
    riskScore: c.risk_score,
    status: c.status,
    version: c.version,
    submittedAt: c.submitted_at,
    decidedAt: c.decided_at,
    decidedBy: c.decided_by_name,
    notes: kycAdapter.notes(c.id).map((n) => ({
      note: n.note, author: n.author_name, at: n.created_at,
    })),
  }));

  cases.sort((a, b) => {
    const o = (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9);
    return o !== 0 ? o : b.riskScore - a.riskScore;
  });

  const open = cases.filter((c) => ['pending', 'in_review', 'escalated'].includes(c.status));
  const stats = {
    open: open.length,
    escalated: cases.filter((c) => c.status === 'escalated').length,
    highRisk: open.filter((c) => c.riskScore >= KYC_HIGH_RISK_CUTOFF).length,
  };
  return { cases, stats, highRiskCutoff: KYC_HIGH_RISK_CUTOFF };
}

export function decide(user, caseId, { status, note, version }) {
  const current = kycAdapter.get(caseId);
  if (!current) throw notFound('Case not found', 'NOT_FOUND');
  if (typeof version !== 'number') throw badRequest('Missing version', 'VERSION_REQUIRED');

  if (!kycTransitionAllowed(current.status, status)) {
    audit(user, 'kyc.decision', {
      entity: 'kyc_case', entityId: caseId, outcome: 'rejected',
      detail: { code: 'ILLEGAL_TRANSITION', from: current.status, to: status },
    });
    throw badRequest(`Illegal transition ${current.status} -> ${status}`, 'ILLEGAL_TRANSITION');
  }

  const needsNote = KYC_NOTE_REQUIRED.includes(status);
  const trimmed = (note ?? '').trim();
  if (needsNote && !trimmed) {
    throw badRequest(`A note is required to ${status} a case`, 'NOTE_REQUIRED');
  }

  const isTerminal = KYC_TERMINAL.includes(status);
  const now = new Date().toISOString();

  return tx(() => {
    const res = kycAdapter.updateStatus({
      id: caseId,
      status,
      version,
      decided_at: isTerminal ? now : null,
      decided_by: isTerminal ? user.id : null,
    });
    if (res.changes === 0) throw conflict('Case was modified by someone else', 'STALE_VERSION');

    if (trimmed) kycAdapter.insertNote(caseId, user.id, trimmed, now);

    audit(user, 'kyc.decision', {
      entity: 'kyc_case', entityId: caseId, outcome: 'success',
      detail: { from: current.status, to: status, noteAdded: Boolean(trimmed) },
    });
    return { ok: true, status };
  });
}
