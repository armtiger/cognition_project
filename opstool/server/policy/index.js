// SINGLE SOURCE OF TRUTH for every compliance decision the app enforces.
// This is functional, load-bearing config: every enforcement point imports
// from here. Changing a value and restarting visibly changes behavior.
// Structural changes ship as reviewed PRs -- never runtime UI toggles.

export const ROLES = ['admin', 'compliance', 'support', 'viewer'];

// Per-action permission matrix, keyed by role. Approval and execution are
// deliberately distinct powers.
export const PERMISSIONS = {
  admin: [
    'kyc.read', 'kyc.decide',
    'refunds.read', 'refunds.approve', 'refunds.process',
    'flags.read', 'flags.write',
    'audit.read', 'policy.read',
  ],
  compliance: [
    'kyc.read', 'kyc.decide',
    'flags.read',
    'audit.read', 'policy.read',
  ],
  support: [
    'kyc.read',
    'refunds.read', 'refunds.approve', 'refunds.process',
    'flags.read', 'policy.read',
  ],
  viewer: [
    'flags.read', 'policy.read',
  ],
};

export function permissionsFor(role) {
  return PERMISSIONS[role] ?? [];
}

export function can(role, action) {
  return permissionsFor(role).includes(action);
}

// --- Thresholds / cutoffs (illustrative; validate with client) ---
export const REFUND_ADMIN_THRESHOLD_CENTS = 50000; // $500.00
export const KYC_HIGH_RISK_CUTOFF = 70;

// --- KYC state machine: allowed transitions per current status ---
export const KYC_TRANSITIONS = {
  pending: ['in_review', 'escalated'],
  in_review: ['approved', 'rejected', 'escalated'],
  escalated: ['in_review', 'approved', 'rejected'],
  approved: [],
  rejected: [],
};
export const KYC_TERMINAL = ['approved', 'rejected'];
// Terminal decisions that require an attributed reason note.
export const KYC_NOTE_REQUIRED = ['rejected', 'escalated'];

export function kycTransitionAllowed(from, to) {
  return (KYC_TRANSITIONS[from] ?? []).includes(to);
}

// --- Refund state machine ---
export const REFUND_TRANSITIONS = {
  requested: ['approved', 'rejected'],
  approved: ['processed'],
  rejected: [],
  processed: [],
};

export function refundTransitionAllowed(from, to) {
  return (REFUND_TRANSITIONS[from] ?? []).includes(to);
}
