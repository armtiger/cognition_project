# OpsTool — Architecture & Build Spec

A prototype that reproduces the **runtime behavior** of three internal Retool
apps for a Series C fintech (~60 engineers) — a **KYC review queue**, a
**refunds dashboard**, and a **feature-flag admin panel** — plus the
cross-cutting governance layer (RBAC + audit logging) that makes internal
tools viable in a regulated fintech.

## 0. What this prototype does and does not prove

**Hypothesis under test:** the company can replace the *runtime behavior* of
its three current Retool apps with a small custom application whose sensitive
actions are enforced and audited server-side.

It intentionally does **not** replicate Retool's app-building *platform*:
drag-and-drop authoring for non-engineers, 50+ data-source connectors and a
query IDE, app versioning/release management for the tools themselves,
environments, hosting, and operational ownership. Those are Retool's broader
value and are the substance of the build-vs-buy trade-off (see `../MEMO.md`).

So a successful demo shows the team can custom-build *these three apps*. It
does **not** show it has replaced Retool as an internal-tools platform. The
evaluation keeps that distinction explicit.

---

## 1. Design principles

1. **Boring, single-deployable stack.** One repo, one API process, one SPA.
   No Kubernetes, no microservices. A 60-person org must maintain this
   without a platform team.
2. **Governance is the product.** For a fintech, Retool's real value is not
   drag-and-drop UI — it's SSO, RBAC, and audit logs that satisfy SOC 2 and
   KYC/AML auditors. These are core here, not bolted on. Every mutation and
   every permission denial writes a structured audit row.
3. **Server-side enforcement.** The UI hides controls a role can't use, but
   authorization is enforced in API middleware. The frontend is untrusted.
4. **State machines, not free-form status fields.** KYC cases and refunds
   have explicit legal-transition maps; illegal transitions are rejected
   with HTTP 400. Terminal states are immutable.
5. **Model the real system boundary.** Retool sits *on top of* existing
   databases, APIs, and SaaS; it is rarely the system of record. Each domain
   here is reached through an **adapter** so the prototype shows what would
   integrate with real systems. Prototype adapters are SQLite/mock-backed.
6. **Policy as code, not runtime toggles.** Anything that encodes a
   compliance decision (permission matrix, state machines, approval rules,
   thresholds) lives in a single version-controlled `policy` module that the
   server actually reads at runtime. Changing a control is a reviewed PR with
   history — never a silent in-UI toggle. A read-only Policy page renders the
   live config so the demo shows exactly what the server enforces.
7. **Fail closed.** Spoofable header auth + SQLite must never run outside a
   local demo. The API refuses to start unless insecure demo auth is
   *explicitly* enabled, and binds to loopback by default.
8. **Least privilege.** Permissions are per-action and derived from group
   membership; domain reads are restricted to roles that need them. No role
   gets blanket read of every domain.
9. **Requester ≠ approver.** Whoever requested a refund can never approve it,
   independent of role (maker-checker).
10. **No decision without review.** KYC cases cannot go straight from
    `pending` to a terminal decision — every case passes through
    `in_review` (or `escalated`) first.

## 2. Stack

| Layer     | Choice                          | Why |
|-----------|---------------------------------|-----|
| Runtime   | Node 24 LTS                     | Supported LTS; Node 20 is EOL (Mar 2026) |
| API       | Express 4                       | Ubiquitous, zero learning curve |
| DB        | SQLite via `better-sqlite3`     | Zero-ops prototype store; stands in for prod Postgres. Synchronous driver + transactions keep route code simple and atomic |
| Frontend  | React 18 + Vite                 | Standard SPA tooling; dev proxy to API |
| Auth      | `X-User-Id` header (mock SSO)   | Stand-in for OIDC session; gated behind an explicit insecure-demo flag (§5) |
| Styling   | Single hand-written CSS file    | No framework needed at this size |

Dev topology: Vite dev server on **:5173** proxies `/api/*` to Express on **:4000**.

## 3. Repository layout

A modest per-domain split (not an enterprise repository hierarchy): each
domain has a router, a service/policy module, and an adapter.

```
opstool/
├── ARCHITECTURE.md
├── README.md
├── package.json
├── vite.config.js               # root: 'web', proxy /api -> :4000
├── server/
│   ├── index.js                 # wiring: app boot + route mounting only
│   ├── app.js                   # express app: middleware order
│   ├── policy/
│   │   ├── index.js             # SINGLE source of truth: PERMISSIONS,
│   │   │                        #   thresholds, state machines, cutoffs
│   │   └── assumptions.js       # illustrative-assumptions metadata for the UI
│   ├── auth/authenticate.js     # header -> req.user (insecure demo seam)
│   ├── authorization/requires.js# action-permission middleware
│   ├── audit/audit.js           # structured append-only audit writer
│   ├── infrastructure/
│   │   └── sqlite/db.js         # schema DDL + idempotent seed + tx helper
│   ├── kyc/{router.js,service.js,adapter.js}
│   ├── refunds/{router.js,service.js,adapter.js}
│   └── flags/{router.js,service.js,adapter.js}
└── web/
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx              # shell: sidebar, user switcher, toasts
        ├── api.js              # fetch wrapper; injects X-User-Id
        ├── styles.css
        └── apps/
            ├── KycQueue.jsx
            ├── Refunds.jsx
            ├── Flags.jsx
            ├── AuditLog.jsx
            └── Policy.jsx       # read-only render of live policy config
```

## 4. Data model (SQLite fixtures behind adapters)

The prototype owns one SQLite DB standing in for what would, in production, be
several separate systems of record reached via their own APIs (see §8).

```sql
users         (id, name, email UNIQUE, role)          -- role: admin|compliance|support|viewer
kyc_cases     (id, customer_name, customer_email, country, document_type,
               risk_score, status, assignee_id, version,
               submitted_at, decided_at, decided_by)
              -- status: pending|in_review|approved|rejected|escalated
              -- version: optimistic-concurrency guard
kyc_notes     (id, case_id, author_id, note, created_at)
              -- individually attributable, immutable
refunds       (id, transaction_ref, customer_name, amount_cents, currency,
               reason, status, version, requested_by, requested_at,
               resolved_at, resolved_by)
              -- status: requested|approved|rejected|processed
feature_flags (id, key UNIQUE, description,
               enabled_dev, enabled_staging, enabled_prod,   -- 0|1 per env
               rollout_pct_dev, rollout_pct_staging, rollout_pct_prod,
               version, updated_at)
audit_log     (id, at, actor_id, actor_role, action, outcome,
               entity, entity_id, detail_json)
              -- APPEND-ONLY: no UPDATE/DELETE code path
              -- detail_json: structured before/after, reason codes, no PII notes
```

Money is integer cents. Timestamps are ISO-8601 UTC strings. Statuses use
CHECK constraints. Seed is idempotent (skipped if users exist): 4 users (one
per role), 8 KYC cases, 7 refunds, 4 flags. `rollout_pct` is **per
environment** to remove the earlier single-value ambiguity.

## 5. AuthN / AuthZ / Audit (cross-cutting)

**Authentication (prototype):** every `/api/*` request carries
`X-User-Id: <id>`; middleware resolves it to a `users` row and sets
`req.user`, else 401. The UI's user dropdown stands in for SSO login.

**Fail-closed boot gate:** header auth + SQLite are enabled only when
`ALLOW_INSECURE_DEMO_AUTH=true` is set *explicitly*. If it is unset or any
other value, the server calls `process.exit(1)` with a fatal error — an
omitted variable never silently enables spoofable auth. The demo API also
binds to `127.0.0.1` by default. This is a placeholder for a real, automated,
tested environment gate (§8).

**Authorization:** one declarative permission map in `policy/index.js`,
checked by a `requires(action)` middleware on every route. Approval and
execution are distinct powers, so refund resolution is split.

| Action              | admin | compliance | support | viewer |
|---------------------|:-----:|:----------:|:-------:|:------:|
| `kyc.read`          |  ✓    |  ✓         |  ✓      |        |
| `kyc.decide`        |  ✓    |  ✓         |         |        |
| `refunds.read`      |  ✓    |            |  ✓      |        |
| `refunds.approve`   |  ✓    |            |  ✓      |        |
| `refunds.process`   |  ✓    |            |  ✓      |        |
| `flags.read`        |  ✓    |  ✓         |  ✓      |  ✓     |
| `flags.write`       |  ✓    |            |         |        |
| `audit.read`        |  ✓    |  ✓         |         |        |
| `policy.read`       |  ✓    |  ✓         |  ✓      |  ✓     |

`viewer` is a genuinely low-privilege role (flags/policy read only), not a
blanket reader of KYC/refund data. Roles map to a permission *set*; the model
is group/action-based even though the demo switcher selects a single persona.

**Audit:** helper `audit(user, action, {entity, entityId, outcome, detail})`
writes a structured row (JSON `detail_json` with before/after + reason codes,
never raw KYC notes/PII). Called on every KYC decision, refund resolution,
flag change, and **every RBAC/policy denial**. Append-only by construction; in
production it also gets DB-grant write-protection, retention, and SIEM export.

## 6. API surface

All routes JSON, prefixed `/api`, authenticated. Errors: `{ error, code? }`.
Mutations run inside a single SQLite transaction (state change + note/event +
audit) and enforce an optimistic-concurrency `version` check (409 on stale).

| Method & path               | Permission        | Behavior |
|-----------------------------|-------------------|----------|
| `GET /me`                   | any authenticated | Current user + resolved permission set |
| `GET /users`                | any authenticated | Demo login switcher list |
| `GET /policy`               | `policy.read`     | Live policy config (permissions, thresholds, state machines, cutoffs) + illustrative-assumptions metadata |
| `GET /kyc`                  | `kyc.read`        | Cases sorted escalated → pending → in_review, then risk desc; joins decider name + attributed `kyc_notes` |
| `POST /kyc/:id/decision`    | `kyc.decide`      | Body `{status, note?, version}`. Server validates the state machine; **reject/escalate require a note (server-enforced)**; note inserted as a new immutable `kyc_notes` row; terminal decisions stamp `decided_at/decided_by`. Atomic + audited |
| `GET /refunds`              | `refunds.read`    | `{refunds, stats, admin_threshold_cents}`; joins requester/resolver names |
| `POST /refunds/:id/approve` | `refunds.approve` | Body `{decision: approved\|rejected, version}`. Policies (audited on denial): **requester can never approve their own refund** (`REQUESTER_CANNOT_APPROVE`, checked first, all roles incl. admin) and **approving > threshold requires admin** (`ADMIN_APPROVAL_REQUIRED`). Atomic + audited |
| `POST /refunds/:id/process` | `refunds.process` | Body `{version}`. `approved → processed` only. Atomic + audited |
| `GET /flags`                | `flags.read`      | All flags ordered by key |
| `PATCH /flags/:id`          | `flags.write`     | Body includes `version`. Partial update of per-env `enabled_*` and per-env `rollout_pct_*`; rollout **rejected (400)** if outside 0–100 (no silent clamp). Structured old→new audit detail. No-op if unchanged |
| `GET /audit`                | `audit.read`      | Latest 200, newest first, with actor name |

**KYC state machine** (from `policy/index.js`):

```
pending    → in_review | escalated      (no direct approve/reject)
in_review  → approved | rejected | escalated
escalated  → in_review | approved | rejected
approved   → (terminal)
rejected   → (terminal)
```

**Refund state machine:** `requested → approved|rejected`,
`approved → processed`; terminal: `rejected`, `processed`.

## 7. Frontend

Single shell (`App.jsx`): sidebar app switcher, a "signed in as" dropdown
(demo SSO), and a toast area surfacing success and API errors (including 403s,
so RBAC denials are visible, not silent). Views re-fetch on user switch so
RBAC changes are immediately visible. The UI reads the caller's permission set
from `/me` and disables controls it lacks — but the server is the enforcer.

- **KYC Review Queue** — stat cards (open, escalated, high-risk ≥ cutoff);
  table sorted open-first; risk color-coded; per-status action buttons
  mirroring the state machine; reject/escalate prompt for a mandatory reason;
  latest attributed note shown.
- **Refunds Dashboard** — stat cards from `/refunds.stats`; each row shows the
  requester; Approve/Reject on `requested`, "Mark processed" on `approved`;
  amounts over the admin threshold flagged. Self-approval / over-threshold
  attempts surface the server's 403 reason as a toast.
- **Feature Flags** — per-flag dev/staging/prod toggles, per-env rollout %,
  last-updated; disabled without `flags.write`; toggling prod confirms first.
- **Audit Log** — reverse-chronological table (time, actor, role, action,
  outcome, entity, detail); access-denied panel for roles without
  `audit.read`.
- **Policy / Assumptions** — read-only render of the live `policy` config
  (permission matrix, thresholds, state machines) with a banner:
  *"Illustrative assumptions — validate with client; changed via reviewed
  config, not at runtime."* This is what makes the policy-as-code model
  visible without creating a runtime backdoor.

## 8. Policy configuration model

Two tiers, defaulting to the more restrictive:

1. **Config-as-code (default).** Everything that encodes a compliance
   decision — the `PERMISSIONS` matrix, KYC/refund transition maps, the
   maker-checker rule, and thresholds/cutoffs — lives in `server/policy/` and
   is imported by every enforcement point (RBAC middleware, state-machine
   checks, refund policy). It is **functional, load-bearing code**: changing a
   value and restarting visibly changes behavior. Changes ship as reviewed
   PRs with history, matching the auditability argument. There is no runtime
   UI to edit these.
2. **Governed admin panel (not built in the MVP; documented seam).** If, in
   production, a business owner needs to tune an *operational parameter* (e.g.
   the refund threshold amount), expose it only through an admin-gated
   (`policy.write`), audited (before→after) endpoint, ideally with
   maker-checker — so the edit itself is a first-class governed action, not a
   backdoor. Structural policy stays in code regardless.

## 9. Illustrative assumptions to validate with the client

The assignment does not specify these; they are reasonable demo defaults, made
configurable in `policy/`, and flagged in the Policy page. They are **not**
requirements and must be confirmed before production:

- Refund admin-approval threshold = **$500.00** (`50000¢`).
- KYC high-risk cutoff = **70**.
- Which roles may read/decide each domain (the §5 matrix).
- Every KYC case must enter `in_review`/`escalated` before a terminal decision.
- Escalated KYC cases may be decided directly by a decider.
- Refund approval and processing are both allowed for admin + support.

## 10. Production hardening (deliberate prototype gaps)

Each shortcut sits behind one seam:

1. **Auth** → OIDC (Okta/Google) sessions in HTTP-only cookies; `req.user`
   contract unchanged. Add SCIM provisioning; strip untrusted identity headers
   at the proxy. The fail-closed flag becomes an automated, tested env gate.
2. **Domain adapters → real systems of record.** The KYC/refunds/flags
   adapters currently read SQLite fixtures. In production they call approved
   domain-service APIs; direct product-DB writes are prohibited (narrow
   read-replica access only where no API exists). This is why domains are
   behind adapters, not one shared DB.
3. **SQLite → Postgres** — same schema; swap the infrastructure adapter, add
   real migrations; multi-statement mutations already run in transactions.
4. **Audit** → richer structured schema (correlation IDs), INSERT-only DB
   grant, retention, SIEM stream (Datadog/Splunk), denial-log rate limiting,
   redaction. Consider auditing sensitive *reads*, not only writes/denials.
5. **Refund execution** — `processed` currently flips a status. Real execution
   is async: approval writes an event + job; a worker calls the payment
   processor with a stable idempotency key; webhooks update execution state;
   reconciliation confirms internal vs. provider state; failures land in a
   manual-review queue — never an ambiguous "processed".
6. **Flags** — do **not** build flag delivery (SDK/edge cache). The approved
   provider (LaunchDarkly or equivalent) stays system of record; this panel
   becomes an administration layer over its API with two-person prod approval.
7. **Event logs** — replace single `resolved_by`/`decided_by` with immutable
   `refund_events` / `kyc_case_events` so lifecycle history is first-class.
8. **Quality gates** — unit tests (state machines, policies), an
   authorization-matrix suite (every role × every sensitive endpoint via
   direct API calls), E2E for the three workflows; CI with
   security/dependency/secret scanning; migration checks; containerized deploy;
   TLS; secrets manager; backups with restore tests; monitoring/alerting;
   named owner + runbooks.

## 11. Out of scope (intentionally not replicated or built)

- Drag-and-drop app builder / non-engineer authoring
- 50+ data-source connectors; query IDE
- App versioning, staging environments, release management for the tools
- A visual per-app/per-query permission editor (permissions stay in code)
- Self-hosted enterprise platform features (workspaces, usage analytics)
- A new identity provider, payment processor, SIEM, or secrets manager
- Feature-flag evaluation SDK / edge delivery / runtime caching
- Microservices or Kubernetes
- The governed policy-edit admin panel (documented seam in §8, not built)

## 12. Run and acceptance criteria

```bash
npm install
ALLOW_INSECURE_DEMO_AUTH=true npm run api    # API on 127.0.0.1:4000
npm run web                                   # web on :5173 (proxies /api)
```

Delete `server/opstool.db*` to reset to fresh seed data.

**Acceptance criteria** (to verify by running the app; do not claim
"verified" until executed):

1. **Fail-closed:** starting the API without `ALLOW_INSECURE_DEMO_AUTH=true`
   exits non-zero with a fatal error and serves no traffic.
2. **RBAC:** Carlos (compliance) can move a case to review and decide it;
   Sam (support) cannot decide KYC — the action is disabled in the UI **and** a
   direct API call returns 403 logging `permission.denied`.
3. **Least privilege:** Vera (viewer) calling `GET /api/kyc` or
   `GET /api/refunds` gets 403; only `flags`/`policy` reads succeed.
4. **State machine:** `pending → approved` via direct API returns 400
   `Illegal transition`; `pending → in_review → approved` succeeds.
5. **Separation of duties + threshold:** the refund requester approving their
   own refund returns 403 `REQUESTER_CANNOT_APPROVE`; an over-threshold refund
   returns 403 `ADMIN_APPROVAL_REQUIRED` for non-admins (and for the admin
   requester); only a *different* admin can approve it.
6. **Server-side validation:** a reject/escalate decision without a note is
   rejected by the API (not just the UI); an out-of-range rollout % returns 400.
7. **Concurrency:** a mutation with a stale `version` returns 409.
8. **Flags:** toggling prod as admin writes a structured `enabled_prod:
   0 -> 1` audit row; controls are disabled for other roles.
9. **Audit access + immutability:** Vera gets an access-denied panel and that
   denial appears in the audit log; reject/escalate reasons appear as
   attributed `kyc_notes` rows with no case field overwritten.
10. **Policy visibility:** the Policy page renders the same threshold/matrix
    the server enforces (round-trips through `GET /api/policy`).

## 13. Working agreement for coding agents (Devin)

Intended for Devin **Knowledge** (with §1–§12 as the base **Playbook**):

- Read this document first; §1's principles are requirements, not advice.
- Every sensitive action is enforced **server-side** with a permission check
  and, where context matters (amount, requester, environment), a policy check
  that writes an audit row on denial. Hiding a button is never the fix.
- New mutations write structured audit rows; new privileged reads get a
  permission key. Never issue UPDATE/DELETE against `audit_log` or `kyc_notes`.
- Policy values (transitions, thresholds, permission matrix) live in
  `server/policy/` only — read them, never duplicate constants. Structural
  policy changes are reviewed PRs; propose them in the PR description, never
  invent them. When a requirement is ambiguous, stop and ask.
- Keep the seams: auth behind `auth/`, persistence behind
  `infrastructure/sqlite/`, each domain behind its adapter, permissions in the
  single `policy` module.
- Update §12's acceptance criteria alongside any behavior change and include
  the verification you ran in the PR.
- Deliverable is always a reviewable PR — never a direct deploy, never
  production credentials or real personal data in fixtures.
