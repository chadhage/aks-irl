# Module 00 — Envisioning & Architecture Decisions

**Time:** ~30 min  |  **Level target:** L300 baseline, L400 stretch

## Outcomes
By the end you will have:
- Translated a fictional customer brief into an **Architecture Decision Record (ADR)**
- Defined SLOs, error budgets, and ring topology
- Sketched the network, identity, and data flows (whiteboard, draw.io, or just bullet points)
- Made (and **documented**) the irreversible Day-0 decisions

## The brief — your fictional customer

> **Contoso Storefront** is launching a customer-facing product catalog API and lightweight web UI. They expect ~500 RPS at launch, growing 4× over a year, with a P95 latency SLO of **300 ms** and a monthly availability SLO of **99.9 %**. They are subject to PCI-adjacent compliance: no public API server, secrets in Key Vault, audit logs retained 30 days. They want **A/B testing** to validate features, **safe rollouts**, and **multi-region survival** of a single Azure region failure.

## Step 1 — Frame the problem (10 min)

Write down (in your notes, the ADR scratchpad, or a whiteboard):
1. **Users & SLIs** — who talks to it, what does success mean per request?
2. **Trust boundaries** — where does customer traffic enter? Where does the platform team's authority end and the app team's begin?
3. **Failure domains** — what counts as "the platform is up" vs "the app is up"?

> Keep the platform-vs-application split sharp. The Terraform in this repo owns the *platform*; GitOps owns the *application*. Many enterprise outages happen at the seam — the right framing now prevents debate later.

## Step 2 — Day-0 decisions (15 min)

Day-0 decisions are *hard or impossible to change later without rebuilding*. Lock them in.

| Decision | Workshop default | Why |
|---|---|---|
| **Cluster SKU** | AKS Standard | Need full control of node pools, spot, mesh revisions, private API. |
| **API server access** | Private Cluster | PCI-adjacent; no public control plane. |
| **Pod network** | Azure CNI **Overlay** (Cilium dataplane) | Scales without VNet exhaustion; required for spot/NAP. |
| **Service mesh** | Istio (managed addon) | Native A/B + mTLS without a third-party install. |
| **Node OS** | Azure Linux | Smaller footprint, faster boot — important for autoscale latency. |
| **Zones** | 1-2-3 across all pools | 99.95 % control-plane SLA + zone-survival. |
| **Region pair** | eastus2 (primary) + westus3 (passive) | Both support all required features; geo-diverse. |
| **Identity** | Workload Identity + Entra RBAC | No static creds; aligns with PCI direction. |
| **Secrets** | Azure Key Vault via CSI Secrets Store | Single source of truth, audited. |
| **Registry** | ACR Premium, geo-replicated, content-trust on | Required for multi-region pull + supply chain. |

Write the **rationale** for any deviation from these defaults in the ADR (template below). Saying "we picked Y because X" is L300. Defending it against the alternative is L400.

## Step 3 — SLOs and error budget (10 min)

| SLI | Definition | SLO | Error budget (30d) |
|---|---|---|---|
| Availability | % of `/api/*` responses with status < 500 | 99.9 % | 43m 12s |
| Latency | % of `/api/*` requests with P95 ≤ 300 ms | 99.0 % | n/a |
| Mesh health | % of Pods passing readiness | 99.5 % | n/a |

These directly drive Module 06 and Module 07 — when the SLO is at risk, you fail forward (intrinsic outage) or fail over (extrinsic outage).

## Step 4 — Write the ADR (15 min)

Copy [`adr-template.md`](adr-template.md) to `adr-001-aks-platform.md`, fill it in, and commit. The ADR is **evaluated in the knowledge check**.

## Stretch (L400)

- Defend Azure CNI Overlay vs Azure CNI VNet-routable in writing. When would you pick the latter?
- Design a "blast radius" diagram: if a single Entra app credential leaks, which resources can it reach?
- Map this design to the [AKS WAF guide](https://learn.microsoft.com/azure/well-architected/service-guides/azure-kubernetes-service) — score Reliability and Security pillars 1–5 and justify.

## Validation
- ADR committed under `modules/00-envisioning/adr-001-aks-platform.md`
- Each Day-0 decision has at least one alternative considered + rejected

## Cleanup
None — keep the ADR. You'll reference it in every subsequent module.
