import { can, permissionsFor } from '../policy/index.js';
import { audit } from '../audit/audit.js';

// Action-permission middleware. Denials are audited as permission.denied.
export function requires(action) {
  return (req, res, next) => {
    if (can(req.user.role, action)) return next();
    audit(req.user, 'permission.denied', {
      outcome: 'denied',
      detail: { action, role: req.user.role },
    });
    return res.status(403).json({ error: `Forbidden: ${action}`, code: 'PERMISSION_DENIED' });
  };
}

export { permissionsFor };
