import { db } from '../infrastructure/sqlite/db.js';

const listStmt = db.prepare(`
  SELECT r.*, rq.name AS requested_by_name, rs.name AS resolved_by_name
  FROM refunds r
  LEFT JOIN users rq ON rq.id = r.requested_by
  LEFT JOIN users rs ON rs.id = r.resolved_by
  ORDER BY r.requested_at DESC, r.id DESC
`);
const getStmt = db.prepare('SELECT * FROM refunds WHERE id = ?');
const updateStmt = db.prepare(`
  UPDATE refunds
  SET status = @status, resolved_at = @resolved_at, resolved_by = @resolved_by,
      version = version + 1
  WHERE id = @id AND version = @version
`);

export const refundAdapter = {
  list: () => listStmt.all(),
  get: (id) => getStmt.get(id),
  update: (args) => updateStmt.run(args),
};
