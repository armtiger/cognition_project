# Recommendation & Close

_4:15–4:50_

My recommendation isn't to replace Retool wholesale — migrate incrementally.
Start with feature flags: they carry no customer data and no money, so you can
build them internally while KYC and refunds stay on Retool.

The real saving comes once every sensitive app is off Retool. Single sign-on
with automatic deprovisioning is Enterprise-only and workspace-wide, so a single
sensitive app keeps you on Enterprise. Move KYC last, given its regulatory
exposure. Then either leave Retool entirely or drop to Business for the low-risk
apps, taking you from $250K a year to roughly $25K to $50K depending on the
number of builders and users.

Ownership does shift the responsibility for security, support, and operations
onto you. If you're OK with that, Devin can reduce both your cost and the
developer time to build and maintain these apps, with the added benefits of
native integration to your own systems and no vendor lock-in. Either way, we at
Cognition are here to help. Thank you for your time, I hope this was helpful.
