import { refundAdapter } from './adapter.js';
import { tx } from '../infrastructure/sqlite/db.js';
import { audit } from '../audit/audit.js';
import { badRequest, notFound, conflict, forbidden } from '../infrastructure/errors.js';
import { REFUND_ADMIN_THRESHOLD_CENTS, refundTransitionAllowed } from '../policy/index.js';

export function listRefunds() {
  const refunds = refundAdapter.list().map((r) => ({
    id: r.id,
    transactionRef: r.transaction_ref,
    customerName: r.customer_name,
    amountCents: r.amount_cents,
    currency: r.currency,
    reason: r.reason,
    status: r.status,
    version: r.version,
    requestedBy: r.requested_by,
    requestedByName: r.requested_by_name,
    requestedAt: r.requested_at,
    resolvedAt: r.resolved_at,
    resolvedByName: r.resolved_by_name,
  }));

  const open = refunds.filter((r) => r.status === 'requested');
  const approved = refunds.filter((r) => r.status === 'approved');
  const stats = {
    openCount: open.length,
    openAmountCents: open.reduce((s, r) => s + r.amountCents, 0),
    approvedAmountCents: approved.reduce((s, r) => s + r.amountCents, 0),
    processedCount: refunds.filter((r) => r.status === 'processed').length,
  };
  return { refunds, stats, admin_threshold_cents: REFUND_ADMIN_THRESHOLD_CENTS };
}

// Approve or reject a `requested` refund.
export function resolveApproval(user, refundId, { decision, version }) {
  const current = refundAdapter.get(refundId);
  if (!current) throw notFound('Refund not found', 'NOT_FOUND');
  if (typeof version !== 'number') throw badRequest('Missing version', 'VERSION_REQUIRED');
  if (!['approved', 'rejected'].includes(decision)) {
    throw badRequest('decision must be approved or rejected', 'BAD_DECISION');
  }
  if (!refundTransitionAllowed(current.status, decision)) {
    throw badRequest(`Illegal transition ${current.status} -> ${decision}`, 'ILLEGAL_TRANSITION');
  }

  // Maker-checker: requester can never approve their own refund (all roles).
  if (decision === 'approved' && current.requested_by === user.id) {
    audit(user, 'refund.approve', {
      entity: 'refund', entityId: refundId, outcome: 'denied',
      detail: { code: 'REQUESTER_CANNOT_APPROVE' },
    });
    throw forbidden('You cannot approve your own refund', 'REQUESTER_CANNOT_APPROVE');
  }

  // Over-threshold approvals require the admin role.
  if (decision === 'approved'
      && current.amount_cents > REFUND_ADMIN_THRESHOLD_CENTS
      && user.role !== 'admin') {
    audit(user, 'refund.approve', {
      entity: 'refund', entityId: refundId, outcome: 'denied',
      detail: { code: 'ADMIN_APPROVAL_REQUIRED', amountCents: current.amount_cents, thresholdCents: REFUND_ADMIN_THRESHOLD_CENTS },
    });
    throw forbidden('Amount over threshold requires an admin approver', 'ADMIN_APPROVAL_REQUIRED');
  }

  const now = new Date().toISOString();
  return tx(() => {
    const res = refundAdapter.update({
      id: refundId, status: decision, version,
      resolved_at: now, resolved_by: user.id,
    });
    if (res.changes === 0) throw conflict('Refund was modified by someone else', 'STALE_VERSION');
    audit(user, 'refund.approve', {
      entity: 'refund', entityId: refundId, outcome: 'success',
      detail: { from: current.status, to: decision, amountCents: current.amount_cents },
    });
    return { ok: true, status: decision };
  });
}

// Execute an `approved` refund (prototype: flips status only; see ARCHITECTURE §10).
export function processRefund(user, refundId, { version }) {
  const current = refundAdapter.get(refundId);
  if (!current) throw notFound('Refund not found', 'NOT_FOUND');
  if (typeof version !== 'number') throw badRequest('Missing version', 'VERSION_REQUIRED');
  if (!refundTransitionAllowed(current.status, 'processed')) {
    throw badRequest(`Illegal transition ${current.status} -> processed`, 'ILLEGAL_TRANSITION');
  }
  const now = new Date().toISOString();
  return tx(() => {
    const res = refundAdapter.update({
      id: refundId, status: 'processed', version,
      resolved_at: now, resolved_by: user.id,
    });
    if (res.changes === 0) throw conflict('Refund was modified by someone else', 'STALE_VERSION');
    audit(user, 'refund.process', {
      entity: 'refund', entityId: refundId, outcome: 'success',
      detail: { from: current.status, to: 'processed', amountCents: current.amount_cents },
    });
    return { ok: true, status: 'processed' };
  });
}
