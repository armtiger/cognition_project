# OpsTool — Five-Minute Demo Script

**Audience:** VP Engineering / technical leadership at a Series C fintech
**Target duration:** 4:45–5:00
**Spoken length:** approximately 725 words; about 4:45–5:00 with clicks and pauses
**Structure:** one overarching Tell → Show → Tell arc

Do not read the italicized screen directions aloud.

## Before recording

1. From the repository root, install dependencies and reset the fixtures:

   ```bash
   cd opstool
   node -v   # requires v24.x
   npm ci --include=optional
   rm -f server/opstool.db*
   ```

2. Start the API in terminal 1:

   ```bash
   ALLOW_INSECURE_DEMO_AUTH=true npm run api
   ```

3. Start the web app in terminal 2:

   ```bash
   cd opstool
   npm run web
   ```

4. Open `http://localhost:5173` in a wide browser window.
5. Start on **Policy**, signed in as **Ana Ramirez · admin**.
6. Open `ARCHITECTURE_SUMMARY.md` in a second tab, pre-scrolled to
   **Deliberate shortcuts and production gap**.
7. Rehearse the exact clicks in the run sheet below. The script is intentionally
   selective; do not attempt to demonstrate every screen.

---

## TELL — 0:00–1:10 — Context, hypothesis, and what to watch for

*[Screen: talking head]*

> Hi, I’m Tigran, a deployed engineer at Cognition. Before this, I spent six
> years in AI product and research roles at fintech startups—as a founder and
> as head of research—and before that, five years at institutional hedge funds
> in London and Geneva.
>
> For anyone new here, Cognition builds Devin, the AI software engineer:
> autonomous agents you can delegate end-to-end software tasks to, used at
> institutions including Goldman Sachs and Citi.
>
> You currently spend about $250,000 a year on Retool Enterprise to support
> three applications: KYC review, refunds, and feature-flag administration.
> I’m excited to help you evaluate whether you could own those applications
> internally, with Devin changing the economics of the build.

*[Screen: Policy page, showing the assumptions banner and permission matrix]*

> Retool’s visible value is tables, forms, and fast app construction. Its
> harder-to-replace value is the governed platform: identity, permissions,
> connectors, environments, deployment, and operational support.
>
> This prototype does not pretend to recreate that whole platform. It tests
> whether these three fixed workflows can be custom-built with their important
> controls enforced by the server.

*[Point to the $500 refund threshold, KYC cutoff of 70, permission matrix, and
state machines.]*

> These are not decorative values. The page renders the same version-controlled
> policy that the API enforces: the permission matrix, state transitions, and
> refund threshold.

> That single source of truth is the foundation for the rest of the demo. As I
> walk through it, watch for explicit workflows, contextual permissions,
> traceable decisions, and the API—not hidden buttons—as the security boundary.

## SHOW — 1:10–3:50 — One continuous product walkthrough

### 1:10–1:50 — KYC: controlled state transitions

*[Switch to Carlos Diaz · compliance, then open KYC Review.]*

> First, KYC. The control I want to prove is that a reviewer cannot jump directly
> from a new case to a terminal decision.

*[Point to Jordan Blake: status Pending, risk 82. Point out that the only actions
are Start review and Escalate. Click Start review, then Approve.]*

> On this pending case there is no Approve or Reject action. Carlos must start
> review first. Once the case is in review, approval becomes available, and the
> case can move to its terminal state.

*[Optionally click Escalate on Nadia Ivanova, show the required-reason prompt,
then cancel it.]*

> Escalation and rejection also require an attributed reason. The UI prompts for
> it, and the API independently rejects an empty note.

### 1:50–2:45 — Refunds: maker-checker and threshold policy

*[Switch to Sam Okoro · support and open Refunds.]*

> Next, refunds. Here I want to prove two contextual rules: nobody approves
> their own request, and amounts over five hundred dollars require an admin.

*[On Jordan Blake, $42 requested by Sam, click Approve.]*

> Sam requested this refund, so the server returns
> `REQUESTER_CANNOT_APPROVE` and leaves it unchanged.

*[On Mina Patel, $1,299 requested by Ana, click Approve.]*

> This request was created by somebody else, but it exceeds the threshold. Sam
> is still blocked with `ADMIN_APPROVAL_REQUIRED`.

*[Switch to Ana Ramirez · admin. Approve Jordan Blake, then click Mark
processed.]*

> Ana is a different approver, so she can approve the $42 request. Processing is
> a separate action, and only after approval can she mark it processed.

### 2:45–3:30 — Feature flags and auditability

*[Open Feature Flags, still as Ana.]*

> The third workflow proves controlled operational change: production changes
> need more friction, valid values must be enforced, and every mutation must be
> traceable.

*[On `instant_refunds`, toggle Production on. Pause on the confirmation dialog,
then accept it. Set Staging rollout to 25 and press Enter. Open Audit Log.]*

> Enabling production requires confirmation. The staging rollout accepts 25,
> while the API rejects percentages outside zero to one hundred.
>
> In the audit log, both changes appear as actor-attributed records with
> structured before-and-after values. The earlier refund denials are logged too,
> including the policy code and amount.

### 3:30–3:50 — Least privilege

*[Switch to Vera Lin · viewer. Open KYC, then Feature Flags.]*

> Finally, a viewer should see only what their job requires.

> KYC returns a server-side 403 rather than exposing customer data. Feature flags
> remain visible, but every control is disabled and the page is clearly marked
> read-only. Vera can also view the Policy page so the rules are transparent.

## TELL — 3:50–5:00 — What the evidence means

### 3:50–4:30 — Honest production assessment

*[Switch to `ARCHITECTURE_SUMMARY.md`, production-gap table.]*

> So what did this prove? The three application runtimes are replicable:
> screens, state machines, contextual permissions, maker-checker rules, and
> structured audit records.
>
> What it did not reproduce is Retool’s mature platform. The persona switcher is
> not real OIDC or SCIM. SQLite is fixture storage, not a production database.
> Refund processing changes a status rather than calling a payment service with
> idempotency, webhooks, and reconciliation. Audit records still need
> tamper-resistant storage and SIEM export. Deployment, monitoring, backups,
> incident response, and a long-term owner are also outside this MVP.
>
> End-to-end testing also found one small UI consistency defect: an invalid flag
> percentage is safely rejected by the server, but the rejected draft remains
> visible until reload. That is low risk, but it is exactly why a prototype is
> evidence—not production readiness.

### 4:30–5:00 — Recommendation and close

*[Stay on the architecture summary or return to talking head.]*

> My recommendation is not a wholesale Retool replacement today. With only
> three apps, keep KYC and refunds on the lower-risk managed platform while
> validating the commercial options.
>
> If the economics still favor ownership, pilot the lower-risk feature-flag
> panel or a read-only workflow with real SSO, production data adapters,
> automated tests, and normal deployment controls. Reassess broader migration
> only when the number of apps and a dedicated platform owner justify the
> ongoing operational cost.
>
> Devin changes the cost and speed of implementation. It does not remove the
> company’s responsibility to define, approve, and operate the controls. That is
> the real build-versus-buy decision.

---

# Exact demo run sheet

Use a fresh database before every complete take.

## Policy setup

1. Sign in as **Ana Ramirez · admin**.
2. Open **Policy**.
3. Point to:
   - assumptions banner;
   - refund threshold **$500.00**;
   - KYC cutoff **70**;
   - permission matrix;
   - KYC and refund state machines.

## KYC

4. Switch persona to **Carlos Diaz · compliance**.
5. Open **KYC Review**.
6. Locate **Jordan Blake**, risk **82**, status **Pending**.
7. Point out **Start review** and **Escalate**, with no direct Approve/Reject.
8. Click **Start review**; wait for status **In review**.
9. Click **Approve**; wait for status **Approved** and action **Terminal**.
10. Optional: on **Nadia Ivanova**, click **Escalate**, pause on the
    reason-required prompt, then cancel. Nadia remains Pending.

## Refunds

11. Switch persona to **Sam Okoro · support**.
12. Open **Refunds**.
13. On **Jordan Blake**, **$42.00**, requested by Sam, click **Approve**.
14. Pause on `REQUESTER_CANNOT_APPROVE`; status remains Requested.
15. On **Mina Patel**, **$1,299.00**, requested by Ana, click **Approve**.
16. Pause on `ADMIN_APPROVAL_REQUIRED`; status remains Requested.
17. Switch persona to **Ana Ramirez · admin**.
18. On Jordan Blake, click **Approve**, then **Mark processed**.
19. Confirm status **Processed** and Processed count increases from 1 to 2.

## Feature flags and audit

20. Open **Feature Flags**.
21. On `instant_refunds`, toggle **Production** on.
22. Pause on `Enable instant_refunds in production?`, then confirm.
23. Change **Staging rollout** from 0 to **25** and press Enter.
24. Open **Audit Log**.
25. Point to:
    - `flag.update` for `enabled_prod`, before 0 → after 1;
    - `flag.update` for `rollout_pct_staging`, before 0 → after 25;
    - Sam’s two denied `refund.approve` records;
    - Ana’s successful refund approval and processing;
    - Carlos’s KYC transitions.

## Viewer

26. Switch persona to **Vera Lin · viewer**.
27. Open **KYC Review**; pause on `403 PERMISSION_DENIED`.
28. Open **Feature Flags**; point to **READ ONLY** and disabled inputs.
29. Open **Policy**; show that governance remains visible.

## Architecture and recommendation

30. Switch to the second tab with `ARCHITECTURE_SUMMARY.md`.
31. Point to the production-gap table while delivering the final assessment.

---

# Delivery guidance

- **Keep the screen moving:** no single screen should remain unchanged for more
  than about 25 seconds.
- **Pause after each result:** let the toast/status appear before explaining its
  significance.
- **Do not demo rollout 150:** the server correctly rejects it, but the current
  input keeps the rejected draft visible until reload. Mention the finding in
  the honest-assessment section instead.
- **If over time:** remove the optional Nadia escalation and shorten the
  production-gap list to SSO, payment integration, audit storage, and ownership.
- **If under time:** pause longer on the audit log and explicitly connect each
  row to the action just demonstrated.
- **Use one macro arc:** the opening 70 seconds tells the audience the question
  and evaluation criteria; the next 160 seconds is one uninterrupted show; the
  final 70 seconds tells them what the evidence means and gives the recommendation.
