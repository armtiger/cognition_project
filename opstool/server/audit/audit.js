import { db } from '../infrastructure/sqlite/db.js';

const insert = db.prepare(`
  INSERT INTO audit_log (at, actor_id, actor_role, action, outcome, entity, entity_id, detail_json)
  VALUES (?,?,?,?,?,?,?,?)
`);

// Structured, append-only audit writer. `detail` is an object serialized to
// JSON (before/after, reason codes) -- never raw KYC notes or PII.
export function audit(user, action, { entity = null, entityId = null, outcome = 'success', detail = null } = {}) {
  insert.run(
    new Date().toISOString(),
    user?.id ?? 'anonymous',
    user?.role ?? 'none',
    action,
    outcome,
    entity,
    entityId,
    detail ? JSON.stringify(detail) : null
  );
}

const list = db.prepare(`
  SELECT a.id, a.at, a.actor_id, a.actor_role, a.action, a.outcome,
         a.entity, a.entity_id, a.detail_json, u.name AS actor_name
  FROM audit_log a
  LEFT JOIN users u ON u.id = a.actor_id
  ORDER BY a.id DESC
  LIMIT 200
`);

export function recentAudit() {
  return list.all().map((r) => ({
    id: r.id,
    at: r.at,
    actorId: r.actor_id,
    actorName: r.actor_name,
    actorRole: r.actor_role,
    action: r.action,
    outcome: r.outcome,
    entity: r.entity,
    entityId: r.entity_id,
    detail: r.detail_json ? JSON.parse(r.detail_json) : null,
  }));
}
