import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'opstool.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function tx(fn) {
  return db.transaction(fn)();
}

export function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','compliance','support','viewer'))
    );

    CREATE TABLE IF NOT EXISTS kyc_cases (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      country TEXT NOT NULL,
      document_type TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','in_review','approved','rejected','escalated')),
      assignee_id TEXT REFERENCES users(id),
      version INTEGER NOT NULL DEFAULT 1,
      submitted_at TEXT NOT NULL,
      decided_at TEXT,
      decided_by TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS kyc_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id TEXT NOT NULL REFERENCES kyc_cases(id),
      author_id TEXT NOT NULL REFERENCES users(id),
      note TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      transaction_ref TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('requested','approved','rejected','processed')),
      version INTEGER NOT NULL DEFAULT 1,
      requested_by TEXT NOT NULL REFERENCES users(id),
      requested_at TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS feature_flags (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      enabled_dev INTEGER NOT NULL DEFAULT 0,
      enabled_staging INTEGER NOT NULL DEFAULT 0,
      enabled_prod INTEGER NOT NULL DEFAULT 0,
      rollout_pct_dev INTEGER NOT NULL DEFAULT 0,
      rollout_pct_staging INTEGER NOT NULL DEFAULT 0,
      rollout_pct_prod INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      outcome TEXT NOT NULL,
      entity TEXT,
      entity_id TEXT,
      detail_json TEXT
    );
  `);

  seed();
}

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return; // idempotent

  const now = '2026-07-14T09:00:00.000Z';

  const insertUser = db.prepare(
    'INSERT INTO users (id, name, email, role) VALUES (?,?,?,?)'
  );
  const users = [
    ['u_ana', 'Ana Ramirez', 'ana@acme.test', 'admin'],
    ['u_carlos', 'Carlos Diaz', 'carlos@acme.test', 'compliance'],
    ['u_sam', 'Sam Okoro', 'sam@acme.test', 'support'],
    ['u_vera', 'Vera Lin', 'vera@acme.test', 'viewer'],
  ];

  const insertKyc = db.prepare(`
    INSERT INTO kyc_cases (id, customer_name, customer_email, country,
      document_type, risk_score, status, assignee_id, submitted_at)
    VALUES (@id,@customer_name,@customer_email,@country,@document_type,
      @risk_score,@status,@assignee_id,@submitted_at)
  `);
  const kyc = [
    { id: 'kyc_1', customer_name: 'Jordan Blake', customer_email: 'jordan@ex.test', country: 'US', document_type: 'passport', risk_score: 82, status: 'pending', assignee_id: null, submitted_at: now },
    { id: 'kyc_2', customer_name: 'Mina Patel', customer_email: 'mina@ex.test', country: 'GB', document_type: 'driver_license', risk_score: 45, status: 'pending', assignee_id: null, submitted_at: now },
    { id: 'kyc_3', customer_name: 'Luis Gomez', customer_email: 'luis@ex.test', country: 'MX', document_type: 'national_id', risk_score: 73, status: 'in_review', assignee_id: 'u_carlos', submitted_at: now },
    { id: 'kyc_4', customer_name: 'Aya Suzuki', customer_email: 'aya@ex.test', country: 'JP', document_type: 'passport', risk_score: 21, status: 'in_review', assignee_id: 'u_carlos', submitted_at: now },
    { id: 'kyc_5', customer_name: 'Omar Haddad', customer_email: 'omar@ex.test', country: 'AE', document_type: 'national_id', risk_score: 91, status: 'escalated', assignee_id: 'u_carlos', submitted_at: now },
    { id: 'kyc_6', customer_name: 'Nadia Ivanova', customer_email: 'nadia@ex.test', country: 'BG', document_type: 'passport', risk_score: 58, status: 'pending', assignee_id: null, submitted_at: now },
    { id: 'kyc_7', customer_name: 'Peter Zhang', customer_email: 'peter@ex.test', country: 'SG', document_type: 'passport', risk_score: 33, status: 'approved', assignee_id: 'u_carlos', submitted_at: now },
    { id: 'kyc_8', customer_name: 'Grace Owusu', customer_email: 'grace@ex.test', country: 'GH', document_type: 'driver_license', risk_score: 67, status: 'rejected', assignee_id: 'u_carlos', submitted_at: now },
  ];

  const insertRefund = db.prepare(`
    INSERT INTO refunds (id, transaction_ref, customer_name, amount_cents,
      currency, reason, status, requested_by, requested_at)
    VALUES (@id,@transaction_ref,@customer_name,@amount_cents,@currency,
      @reason,@status,@requested_by,@requested_at)
  `);
  const refunds = [
    { id: 'rf_1', transaction_ref: 'TXN-88231', customer_name: 'Jordan Blake', amount_cents: 4200, currency: 'USD', reason: 'Duplicate charge', status: 'requested', requested_by: 'u_sam', requested_at: now },
    { id: 'rf_2', transaction_ref: 'TXN-88104', customer_name: 'Mina Patel', amount_cents: 129900, currency: 'USD', reason: 'Service not delivered', status: 'requested', requested_by: 'u_ana', requested_at: now },
    { id: 'rf_3', transaction_ref: 'TXN-88410', customer_name: 'Luis Gomez', amount_cents: 7500, currency: 'USD', reason: 'Overcharge', status: 'requested', requested_by: 'u_sam', requested_at: now },
    { id: 'rf_4', transaction_ref: 'TXN-88055', customer_name: 'Aya Suzuki', amount_cents: 63000, currency: 'USD', reason: 'Fraudulent transaction', status: 'requested', requested_by: 'u_sam', requested_at: now },
    { id: 'rf_5', transaction_ref: 'TXN-87990', customer_name: 'Omar Haddad', amount_cents: 15000, currency: 'USD', reason: 'Cancelled order', status: 'approved', requested_by: 'u_sam', requested_at: now },
    { id: 'rf_6', transaction_ref: 'TXN-87888', customer_name: 'Nadia Ivanova', amount_cents: 2500, currency: 'USD', reason: 'Goodwill', status: 'processed', requested_by: 'u_sam', requested_at: now },
    { id: 'rf_7', transaction_ref: 'TXN-87777', customer_name: 'Peter Zhang', amount_cents: 9900, currency: 'USD', reason: 'Duplicate charge', status: 'rejected', requested_by: 'u_sam', requested_at: now },
  ];

  const insertFlag = db.prepare(`
    INSERT INTO feature_flags (id, key, description, enabled_dev,
      enabled_staging, enabled_prod, rollout_pct_dev, rollout_pct_staging,
      rollout_pct_prod, updated_at)
    VALUES (@id,@key,@description,@enabled_dev,@enabled_staging,@enabled_prod,
      @rollout_pct_dev,@rollout_pct_staging,@rollout_pct_prod,@updated_at)
  `);
  const flags = [
    { id: 'ff_1', key: 'new_kyc_flow', description: 'New KYC onboarding flow', enabled_dev: 1, enabled_staging: 1, enabled_prod: 0, rollout_pct_dev: 100, rollout_pct_staging: 50, rollout_pct_prod: 0, updated_at: now },
    { id: 'ff_2', key: 'instant_refunds', description: 'Instant refund processing', enabled_dev: 1, enabled_staging: 0, enabled_prod: 0, rollout_pct_dev: 100, rollout_pct_staging: 0, rollout_pct_prod: 0, updated_at: now },
    { id: 'ff_3', key: 'risk_v2_model', description: 'Risk scoring model v2', enabled_dev: 1, enabled_staging: 1, enabled_prod: 1, rollout_pct_dev: 100, rollout_pct_staging: 100, rollout_pct_prod: 25, updated_at: now },
    { id: 'ff_4', key: 'dark_mode', description: 'Dark mode UI', enabled_dev: 1, enabled_staging: 1, enabled_prod: 1, rollout_pct_dev: 100, rollout_pct_staging: 100, rollout_pct_prod: 100, updated_at: now },
  ];

  db.transaction(() => {
    users.forEach((u) => insertUser.run(...u));
    kyc.forEach((c) => insertKyc.run(c));
    refunds.forEach((r) => insertRefund.run(r));
    flags.forEach((f) => insertFlag.run(f));
  })();
}
