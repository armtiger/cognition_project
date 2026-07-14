# OpsTool — architecture summary

## Scope and hypothesis

OpsTool tests whether a 60-engineer fintech can replace the **runtime behavior**
of its three current Retool apps (KYC review, refunds, feature-flag admin) with
a custom application. It does not replicate Retool's app-building platform,
connectors, environments, release tooling, hosting, or operational ownership.

```text
                         React SPA
                 (five internal-tool views)
                              |
                    Express API / BFF
             mock auth → action RBAC → policy
                  |           |          |
             KYC service  Refund service  Flags service
                  |           |          |
             KYC adapter  Refund adapter  Flags adapter
                  \           |          /
                   SQLite fixture implementations
                              |
              structured append-only audit service

Production: adapters call the approved KYC API, payment/refund service,
feature-management provider, and SIEM/audit sink. SQLite owns no real domain.
```

## Key decisions

- **Single deployable:** React/Vite SPA + Node 24/Express API. No
  microservices/Kubernetes; maintainable by a small team.
- **Adapters model Retool's boundary:** Retool normally orchestrates existing
  systems rather than owning business data. Each domain is isolated behind an
  adapter; SQLite is only the local fixture implementation.
- **Server-enforced governance:** action permissions, contextual policies, and
  state transitions are checked in the API. UI disabling is only a convenience.
- **Policy as functional code:** permission matrix, state machines, the $500
  refund threshold, and risk cutoff have one version-controlled source in
  `server/policy/`. The read-only Policy page renders those same live values.
- **Least privilege:** KYC, refunds, flags, audit, and policy have separate
  read/write/approve/process actions. Viewer cannot read KYC/refund PII.
- **Correctness controls:** atomic mutations, optimistic versions, immutable
  KYC notes, integer money, server-side validation, and structured audit detail.
- **Fail closed:** spoofable header auth works only with an explicit
  `ALLOW_INSECURE_DEMO_AUTH=true` flag and loopback binding.

## Deliberate shortcuts and production gap

| Prototype | Production requirement |
|---|---|
| Header persona switcher | OIDC sessions, SCIM, proxy header stripping |
| SQLite fixture adapters | Real domain APIs, Postgres migrations |
| Status flip for `processed` | Async payment worker, idempotency, webhooks, reconciliation |
| Local structured audit | INSERT-only grants, retention, correlation IDs, SIEM stream |
| Flag fixture store | Approved provider remains system of record/delivery plane |
| Single-process dev run | CI/security scans, TLS, secrets, backups, monitoring, runbooks, owner |

## Trade-off

The custom build can reproduce three fixed workflows and tailor their controls.
The company then owns every integration, security control, deployment,
incident, and future change. A successful MVP is evidence for replacing these
apps—not evidence that the broader Retool platform has been recreated.
