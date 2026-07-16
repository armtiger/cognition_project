import { db } from '../infrastructure/sqlite/db.js';

const listStmt = db.prepare('SELECT * FROM feature_flags ORDER BY key');
const getStmt = db.prepare('SELECT * FROM feature_flags WHERE id = ?');

const WRITABLE_COLUMNS = new Set([
  'enabled_dev', 'enabled_staging', 'enabled_prod',
  'rollout_pct_dev', 'rollout_pct_staging', 'rollout_pct_prod',
]);

export const flagsAdapter = {
  list: () => listStmt.all(),
  get: (id) => getStmt.get(id),
  // Column names are validated against WRITABLE_COLUMNS before being placed
  // in the SQL template; values remain bound parameters.
  update(id, version, changes) {
    const keys = Object.keys(changes);
    for (const key of keys) {
      if (!WRITABLE_COLUMNS.has(key)) {
        throw new Error(`flagsAdapter.update: illegal column "${key}"`);
      }
    }
    const sets = keys.map((k) => `${k} = @${k}`).join(', ');
    const stmt = db.prepare(`
      UPDATE feature_flags
      SET ${sets}, updated_at = @updated_at, version = version + 1
      WHERE id = @id AND version = @version
    `);
    return stmt.run({ ...changes, id, version, updated_at: new Date().toISOString() });
  },
};
