import { db } from '../infrastructure/sqlite/db.js';

const listStmt = db.prepare('SELECT * FROM feature_flags ORDER BY key');
const getStmt = db.prepare('SELECT * FROM feature_flags WHERE id = ?');

export const flagsAdapter = {
  list: () => listStmt.all(),
  get: (id) => getStmt.get(id),
  // Dynamic field set is safe here because `sets` comes only from an
  // allowlisted set in the service; values remain bound parameters.
  update(id, version, changes) {
    const keys = Object.keys(changes);
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    const stmt = db.prepare(`
      UPDATE feature_flags
      SET ${sets}, updated_at = @updated_at, version = version + 1
      WHERE id = @id AND version = @version
    `);
    return stmt.run({ ...changes, id, version, updated_at: new Date().toISOString() });
  },
};
