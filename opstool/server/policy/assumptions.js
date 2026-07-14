// Illustrative assumptions surfaced (read-only) in the Policy page so the demo
// is honest about what is a real requirement vs. a reasonable default.
export const ASSUMPTIONS = [
  'Refund admin-approval threshold = $500.00 (50000 cents).',
  'KYC high-risk cutoff = 70.',
  'Role -> permission mapping (see the matrix) is a demo default.',
  'Every KYC case must enter in_review/escalated before a terminal decision.',
  'Escalated KYC cases may be decided directly by a decider.',
  'Refund approval and processing are both allowed for admin + support.',
];

export const BANNER =
  'Illustrative assumptions — validate with client. Changed via reviewed ' +
  'config (server/policy/), not at runtime.';
