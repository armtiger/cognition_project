# Recommendation: Migrate Incrementally, Not Wholesale

> **Don't rip out Retool. Move one workflow at a time — starting with the lowest-risk one.**

---

### The path

| Step | Move | Why this order |
|------|------|----------------|
| **1. Start** | Feature flags | No customer data, no money — safe to build internally first |
| **2. Then** | Refunds | Money movement, but bounded and well-understood |
| **3. Last** | KYC | Highest regulatory exposure — move it once the pattern is proven |

*KYC and refunds stay on Retool while you build.*

---

### Where the savings come from

```
   Today: ~$250K / year   ──────▶   After migration: ~$25K–$50K / year
```

- Savings land **only once every sensitive app is off Retool.**
- SSO with automatic deprovisioning is **Enterprise-only and workspace-wide** — a *single* sensitive app keeps the whole workspace on Enterprise.
- Endgame: **leave Retool entirely**, or **drop to Business** for the low-risk apps.
- Final range depends on the number of builders and users.

---

### The trade-off

| You gain | You take on |
|----------|-------------|
| Lower cost | Security ownership |
| Less build & maintenance time | Support ownership |
| Native integration with your systems | Operations ownership |
| No vendor lock-in | |

---

> **If you're OK owning security, support, and operations, Devin can cut both cost and developer time to build and maintain these apps.**
>
> Either way, we at Cognition are here to help.
