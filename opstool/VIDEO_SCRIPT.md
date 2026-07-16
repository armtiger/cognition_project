# OpsTool — Five-Minute Demo Script

**Audience:** VP Engineering / technical leadership at a Series C fintech
**Target duration:** 5:00–5:20
**Spoken length:** approximately 730 words; about 4:30–4:50 with clicks and pauses
**Structure:** one overarching Tell → Show → Tell arc

Do not read the italicized screen directions aloud.

## Before recording

1. From the repository root, verify Node and install dependencies. Run this
   during initial setup and whenever `package-lock.json` changes:

   ```bash
   cd opstool
   node -v   # requires v24.x
   npm ci --include=optional
   ```

   On an Apple Silicon Mac, npm may still omit Rolldown's native package. Run
   this immediately after every fresh `npm ci`:

   ```bash
   npm install --no-save --package-lock=false --include=optional \
     @rolldown/binding-darwin-arm64@1.1.5
   ```

   You do not need to repeat either install command for an ordinary restart.

2. Before every complete recording, reset the fixtures:

   ```bash
   rm -f server/opstool.db*
   ```

3. Start the API in terminal 1:

   ```bash
   ALLOW_INSECURE_DEMO_AUTH=true npm run api
   ```

4. Start the web app in terminal 2:

   ```bash
   cd opstool
   npm run web
   ```

5. Open `http://localhost:5173` in a wide browser window.
6. Start on **Policy**, signed in as **Ana Ramirez · admin**.
7. Open `ARCHITECTURE_SUMMARY.md` in a second tab, pre-scrolled to
   **Deliberate shortcuts and production gap**.
8. Rehearse the exact clicks in the run sheet below. The script is intentionally
   selective; do not attempt to demonstrate every screen.

---

## TELL — 0:00–1:10 — Context, hypothesis, and what to watch for

> Hi, I’m Tigran, a deployed engineer at Cognition. Before this, I spent six
> years in AI product and research roles at fintech startups—as a founder and
> as head of research— and before that I worked five years at institutional hedge funds.
>
> For anyone new here, Cognition builds Devin, the AI software engineer used at
> institutions including Goldman Sachs and Citi.
>
> In our last meeting you mentioned you currently spend about $250,000 a year on
> Retool to support three apps: KYC review, refunds, and feature-flag admin.
> I’m excited to help you evaluate whether you could own those applications
> internally, with Devin changing the economics of the build.

> Retool’s value goes beyond app construction. This pricing page shows the
> harder-to-replace features of the platform. Business includes audit logging, rich
> permissions, and unlimited environments and modules. Enterprise adds SAML or
> OIDC single sign on, source control, and independent workspaces. Those
> governance and operational capabilities are what a custom build must replace.
>
> I will now demo an app built with Devin in a few hours from a defined scope and
> architecture spec. It's a prototype of the three workflows you run on Retool,
> with their governance controls enforced server-side.

## SHOW — 1:10–3:50 — One continuous product walkthrough

### 1:10–1:30 — KYC: controlled state transitions

> Here, these are not decorative values. The page renders the same
> version-controlled policy that the API enforces: the permission matrix, state
> transitions, and refund threshold.

### 1:30–2:10 — KYC: controlled state transitions

> First, let's review KYC. Carlos, who works in compliance, is on the KYC
> dashboard. One rule here is that he cannot approve or reject cases right away.
> He must either start a review or escalate. Once the case is in review, approval
> becomes available, and the case can move to its finished state.

> Escalation and rejection also require an attributed reason. The UI prompts for
> it, and the API independently rejects an empty note.

### 2:10–2:55 — Refunds: maker-checker and threshold policy

> Next, let's navigate to the refunds dashboard in the profile of Sam from
> support. The build has two contextual rules: no self-approval, and amounts
> above five hundred dollars requiring an admin.

> Sam requested this refund, so the server returns
> `REQUESTER_CANNOT_APPROVE` and leaves it unchanged when he tries to approve.

> This request was created by somebody else, but it exceeds the threshold. Sam
> is still blocked with `ADMIN_APPROVAL_REQUIRED`.

> Ana is an admin, so she can approve this $630 request, which is above the
> threshold. Processing is a separate action, and only after approval can she
> mark it processed.

### 2:55–3:30 — Feature flags and auditability

> Next, let's navigate to the feature flags dashboard. This workflow enforces
> controlled, validated, and traceable operational change.

> Each environment is controlled on its own, so you can ship to staging without
> touching production.

> Writes are guarded against collisions. As an example, let's change the rollout
> value in this session, and try to make a change in a parallel session which is
> still on the previous version. The server rejects it with a stale-version
> conflict rather than silently overwriting the first edit.

> And every change is traceable. The audit log is append-only, so records can be
> added but never edited or deleted. Each edit is a record with structured
> before-and-after values. The earlier refund denials are logged as well,
> including the policy code and amount.

### 3:30–3:50 — Least privilege

> Finally, sensitive information should only be exposed to users who need that
> information for their job.

> Here, Vera does not need to work with KYC and refunds data for her job, hence
> the dashboards return a server-side 403 rather than exposing confidential data
> to the user.

## TELL — 3:50–4:50 — What the evidence means

### 3:50–4:15 — Honest production assessment

> So what did this prove? We reproduced the three apps’ screens, workflow rules,
> permissions, approval controls, and audit history.
>
> What we did not reproduce is Retool’s mature platform. The persona switcher
> isn’t a real company login, the data is demo data, and refund processing moves
> no money. Real production still needs hardened authentication, payment
> integration, and the usual operational ownership. This prototype is evidence,
> but production readiness requires more work to cover the gaps, which are
> covered in this section.

### 4:15–4:50 — Recommendation and close

> My recommendation isn't to replace Retool wholesale — migrate incrementally.
> Start with feature flags: they carry no customer data and no money, so you can
> build them internally while KYC and refunds stay on Retool.
>
> But the real saving only lands once every sensitive app is off Retool. Single
> sign-on with automatic deprovisioning is Enterprise-only and workspace-wide, so
> a single sensitive app keeps you on Enterprise. Move KYC last, given its
> regulatory exposure — then either leave Retool entirely or drop to Business for
> the low-risk apps, taking you from about $250,000 a year to roughly $25,000 to
> $50,000.
>
> Ownership does shift the responsibility for security, support, and operations
> onto you. If you're OK with that, Devin can reduce both your cost and the
> developer time to build and maintain these apps, with the added benefits of
> native integration to your own systems and no vendor lock-in. Either way, we at
> Cognition are here to help. Thank you for your time, I hope this was helpful.

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
9. Click **Approve**; wait for status **Approved** and action **Completed**.
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
18. On **Aya Suzuki**, **$630.00**, requested by Sam, click **Approve**, then
    **Mark processed**.
19. Confirm status **Processed** and Processed count increases from 1 to 2.

## Feature flags and audit

20. Open **Feature Flags**.
21. On `instant_refunds`, enable **Staging**.
22. Change **Staging rollout** from 0 to **25** and press Enter.
23. Concurrency demo (two browser tabs, both **Ana Ramirez · admin**):
    - Open `instant_refunds` in a second tab.
    - In tab 1, change **Staging rollout** to **50** and save.
    - In tab 2 (still on the older version), change any value and save;
      pause on the `STALE_VERSION` conflict (`Flag was modified by someone
      else`).
24. Open **Audit Log**.
25. Point to:
    - `flag.update` for `enabled_staging`, before 0 → after 1;
    - `flag.update` for `rollout_pct_staging`, before 0 → after 25 → after 50;
    - Sam’s two denied `refund.approve` records;
    - Ana’s successful refund approval and processing;
    - Carlos’s KYC transitions.

## Viewer

26. Switch persona to **Vera Lin · viewer**.
27. Open **KYC Review**; pause on `403 PERMISSION_DENIED`.
28. Open **Refunds**; pause on `403 PERMISSION_DENIED`.
29. Open **Feature Flags**; point to **READ ONLY** and disabled inputs.
30. Open **Policy**; show that governance remains visible.

## Architecture and recommendation

31. Switch to the second tab with `ARCHITECTURE_SUMMARY.md`.
32. Point to the production-gap table while delivering the final assessment.

---

# Delivery guidance

- **Keep the screen moving:** no single screen should remain unchanged for more
  than about 25 seconds.
- **Pause after each result:** let the toast/status appear before explaining its
  significance.
- **Do not demo rollout 150:** the server correctly rejects it, but the current
  input keeps the rejected draft visible until reload. Mention the finding in
  the honest-assessment section instead.
- **Verify pricing before recording:** the estimate assumes current annual
  Business list prices of $50 per builder and $15 per internal user.
- **If over time:** remove the optional Nadia escalation and shorten the
  production-gap list to SSO, payment integration, audit storage, and ownership.
- **If under time:** pause longer on the audit log and explicitly connect each
  row to the action just demonstrated.
- **Use one macro arc:** the opening 70 seconds tells the audience the question
  and evaluation criteria; the next 160 seconds is one uninterrupted show; the
  final 70 seconds tells them what the evidence means and gives the recommendation.
