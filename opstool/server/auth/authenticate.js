import { db } from '../infrastructure/sqlite/db.js';

const findUser = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?');

// PROTOTYPE SEAM: header-based mock auth. In production this is replaced by an
// OIDC session (HTTP-only cookie) that populates the same req.user contract.
export function authenticate(req, res, next) {
  const userId = req.get('X-User-Id');
  if (!userId) {
    return res.status(401).json({ error: 'Missing X-User-Id', code: 'UNAUTHENTICATED' });
  }
  const user = findUser.get(userId);
  if (!user) {
    return res.status(401).json({ error: 'Unknown user', code: 'UNAUTHENTICATED' });
  }
  req.user = user;
  next();
}
