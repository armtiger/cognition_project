import { flagsAdapter } from './adapter.js';
import { tx } from '../infrastructure/sqlite/db.js';
import { audit } from '../audit/audit.js';
import { badRequest, notFound, conflict } from '../infrastructure/errors.js';

const BOOL_FIELDS = ['enabled_dev', 'enabled_staging', 'enabled_prod'];
const PCT_FIELDS = ['rollout_pct_dev', 'rollout_pct_staging', 'rollout_pct_prod'];
const ALLOWED = [...BOOL_FIELDS, ...PCT_FIELDS];

function mapFlag(f) {
  return {
    id: f.id,
    key: f.key,
    description: f.description,
    enabled_dev: Boolean(f.enabled_dev),
    enabled_staging: Boolean(f.enabled_staging),
    enabled_prod: Boolean(f.enabled_prod),
    rollout_pct_dev: f.rollout_pct_dev,
    rollout_pct_staging: f.rollout_pct_staging,
    rollout_pct_prod: f.rollout_pct_prod,
    version: f.version,
    updatedAt: f.updated_at,
  };
}

export function listFlags() {
  return { flags: flagsAdapter.list().map(mapFlag) };
}

export function updateFlag(user, id, body) {
  const current = flagsAdapter.get(id);
  if (!current) throw notFound('Flag not found', 'NOT_FOUND');
  const { version } = body ?? {};
  if (typeof version !== 'number') throw badRequest('Missing version', 'VERSION_REQUIRED');

  const changes = {};
  for (const key of ALLOWED) {
    if (!(key in body)) continue;
    const value = body[key];
    if (BOOL_FIELDS.includes(key)) {
      if (typeof value !== 'boolean') throw badRequest(`${key} must be boolean`, 'BAD_VALUE');
      changes[key] = value ? 1 : 0;
    } else {
      if (!Number.isInteger(value) || value < 0 || value > 100) {
        throw badRequest(`${key} must be an integer from 0 to 100`, 'ROLLOUT_OUT_OF_RANGE');
      }
      changes[key] = value;
    }
  }

  const beforeAfter = {};
  for (const [key, value] of Object.entries(changes)) {
    const before = current[key];
    if (before !== value) beforeAfter[key] = { before, after: value };
    else delete changes[key];
  }

  if (Object.keys(changes).length === 0) return { ok: true, unchanged: true };

  return tx(() => {
    const res = flagsAdapter.update(id, version, changes);
    if (res.changes === 0) throw conflict('Flag was modified by someone else', 'STALE_VERSION');
    audit(user, 'flag.update', {
      entity: 'feature_flag', entityId: id, outcome: 'success', detail: beforeAfter,
    });
    return { ok: true };
  });
}
