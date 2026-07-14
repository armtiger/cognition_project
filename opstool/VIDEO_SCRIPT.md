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

*[Screen: Retool pricing page, showing the Business and Enterprise line
items.]*

> Retool’s value goes beyond app construction. This pricing page shows the
> harder-to-replace features of the platform. Business includes audit logging, rich
> permissions, and unlimited environments and modules. Enterprise adds SAML or
> OIDC single sign on, source control, independent workspaces. Those
> governance and operational capabilities are what a custom build must replace.
>
> I will now demo a protortype built with Devin that tests whether these
> three fixed workflows can be custom-built with controls enforced server-side.
> The demo does not claim to recreate all of the requiered features. 

## SHOW — 1:10–3:50 — One continuous product walkthrough

### 1:10–1:30 — KYC: controlled state transitions

*[Switch to the Policy page. Point to the $500 refund threshold, KYC cutoff of
70, permission matrix, and state machines.]*

> Here, these are not decorative values. The page renders the same
> version-controlled policy that the API enforces: the permission matrix, state
> transitions, and refund threshold.

> As I walk through it, watch for explicit workflows, contextual permissions,
> traceable decisions, and server-enforced security.

### 1:30–2:10 — KYC: controlled state transitions

*[Switch to Carlos Diaz · compliance, then open KYC Review.]*

> First, KYC: a reviewer cannot jump from a new case to a terminal decision.

*[Point to Jordan Blake: status Pending, risk 82. Point out that the only actions
are Start review and Escalate. Click Start review, then Approve.]*

> On this pending case there is no Approve or Reject action. Carlos must start
> review first. Once the case is in review, approval becomes available, and the
> case can move to its terminal state.

*[Optionally click Escalate on Nadia Ivanova, show the required-reason prompt,
then cancel it.]*

> Escalation and rejection also require an attributed reason. The UI prompts for
> it, and the API independently rejects an empty note.

### 2:10–2:55 — Refunds: maker-checker and threshold policy

*[Switch to Sam Okoro · support and open Refunds.]*

> Refunds prove two contextual rules: no self-approval, and amounts above five
> hundred dollars require an admin.

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

### 2:55–3:30 — Feature flags and auditability

*[Open Feature Flags, still as Ana.]*

> Feature flags prove controlled, validated, and traceable operational change.

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

## TELL — 3:50–4:50 — What the evidence means

### 3:50–4:15 — Honest production assessment

*[Switch to `ARCHITECTURE_SUMMARY.md`, production-gap table.]*

> So what did this prove? We reproduced the three apps’ screens, workflow rules,
> permissions, approval controls, and audit history.
>
> What it did not reproduce is Retool’s mature platform. The persona switcher
> isn’t a real company login, the data is demo data, and refund processing moves
> no money. Real production still needs hardened auth, payment integration, and
> the usual operational ownership. A prototype is evidence, not production
> readiness.

### 4:15–4:50 — Recommendation and close

*[Stay on the architecture summary or return to talking head.]*

> My recommendation: don’t replace Retool wholesale, and don’t treat the price
> as a gradual dial. Migration can be incremental—start with feature flags, no
> customer data or money, as a parallel internal build while KYC and refunds
> stay on Retool. But the saving is a single cliff, not a slider. SAML single
> sign-on with automatic deprovisioning is Enterprise-only and applies to the
> whole workspace—you can’t buy it for KYC alone—so while any sensitive app
> stays on Retool, you stay on Enterprise.
>
> So the endgame is a single decision once KYC and refunds have both moved onto
> the internal build—migrate KYC last, given its regulatory exposure. At that
> point you either leave Retool entirely, or downgrade to Business for whatever
> low-risk apps remain, since the internal build now carries its own single
> sign-on and Business’s audit logging and permissions cover the rest. The
> downgrade alone puts about eight builders and 125 users in a 250-person company
> at roughly $27,000 a year versus the current $250,000 contract.
>
> Devin lowers the cost and time to build, not the responsibility for security,
> support, and operations. That is the real build-versus-buy decision.

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
- **Verify pricing before recording:** the estimate assumes current annual
  Business list prices of $50 per builder and $15 per internal user.
- **If over time:** remove the optional Nadia escalation and shorten the
  production-gap list to SSO, payment integration, audit storage, and ownership.
- **If under time:** pause longer on the audit log and explicitly connect each
  row to the action just demonstrated.
- **Use one macro arc:** the opening 70 seconds tells the audience the question
  and evaluation criteria; the next 160 seconds is one uninterrupted show; the
  final 70 seconds tells them what the evidence means and gives the recommendation.
