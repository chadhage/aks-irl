# Enterprise-Scale AKS — In Real Life (IRL)

> A 2-day, hands-on workshop that takes an AKS practitioner from a **napkin sketch** to a **live customer**, then through A/B testing, deployment rings, surviving intrinsic and extrinsic outages, and finally a knowledge check.

**Audience entry level:** L200 (you've created a cluster, deployed a pod, used `kubectl`).
**Audience exit level:**
- 20% → **L400** (can architect a multi-region, ring-gated, observability-rich AKS platform from scratch)
- 70% → **L300+** (can confidently operate, scale, and remediate an enterprise AKS platform)
- 10% → high L200 (comfortable extending and operating, with help on advanced topics)

## Workshop format

- **Length:** 2 days × 8 hours (≈ 16 hours hands-on)
- **Style:** Whiteboard → plan → build → break → fix → measure
- **Cohort size:** 6–24 participants in pods of 2–3
- **Subscription:** Sandbox / MCAPS / training subscription with **≥ 50 vCPU quota** in **eastus2** (primary) and **westus3** (DR)
- **Tooling provided:** Terraform IaC, container images, sample app source, GitOps repo skeleton, chaos experiments, knowledge check.

## Success criteria → mapped modules

| # | Success criterion | Module(s) | Day |
|---|---|---|---|
| 1 | Take an MVP from napkin to live customer | [modules/00-envisioning](modules/00-envisioning/README.md) → [modules/03-mvp-go-live](modules/03-mvp-go-live/README.md) | 1 |
| 2 | Extend the MVP and add A/B testing | [modules/04-ab-testing](modules/04-ab-testing/README.md) | 2 |
| 3 | Add multiple deployment rings with gates | [modules/05-deployment-rings](modules/05-deployment-rings/README.md) | 2 |
| 4 | Survive an **intrinsic** outage (service degradation) | [modules/06-intrinsic-outage](modules/06-intrinsic-outage/README.md) | 2 |
| 5 | Survive an **extrinsic** outage (service interruption) | [modules/07-extrinsic-outage](modules/07-extrinsic-outage/README.md) | 2 |
| 6 | Pass the knowledge check | [assessment/knowledge-check.md](assessment/knowledge-check.md) | 2 (close) |

## Schedule at a glance

### Day 1 — From napkin to live customer
| Time | Module | Outcome |
|---|---|---|
| 09:00 – 09:30 | Kickoff + L200 baseline check | Shared vocabulary |
| 09:30 – 10:30 | **M00 — Envisioning & whiteboarding** | Architecture decision record drafted |
| 10:30 – 12:00 | **M01 — Platform foundation (Terraform)** | Hub-spoke + AKS + ACR + KV + observability live |
| 13:00 – 14:00 | **M02 — Cluster hardening & access** | Workload Identity, KV CSI, RBAC, ingress |
| 14:00 – 16:30 | **M03 — MVP go-live** | Polyglot app live behind Istio gateway |
| 16:30 – 17:00 | Retro + Day 2 preview | |

### Day 2 — Extend, ring, survive, optimize
| Time | Module | Outcome |
|---|---|---|
| 09:00 – 10:30 | **M04 — A/B testing with Istio** | Two versions, weighted + header-based routing |
| 10:30 – 12:00 | **M05 — Deployment rings + gates** | dev → canary → prod via Argo CD + GH Actions |
| 13:00 – 14:30 | **M06 — Intrinsic outage** | Pod/node/zone chaos; survive with PDB + HPA + multi-AZ |
| 14:30 – 15:45 | **M07 — Extrinsic outage** | Region-out; Front Door fails over to passive cluster |
| 15:45 – 16:30 | **M08 — Optimization & cost** | Spot pools, KEDA, NAP, rightsizing |
| 16:30 – 17:00 | **Knowledge check** + close | Each participant rated L200/300/400 |

## Repository layout

```
.
├── README.md                          # you are here
├── prerequisites.md                   # what to install/provision before Day 1
├── modules/                           # lab guides, one per module
│   ├── 00-envisioning/
│   ├── 01-platform-foundation/
│   ├── 02-cluster-hardening/
│   ├── 03-mvp-go-live/
│   ├── 04-ab-testing/
│   ├── 05-deployment-rings/
│   ├── 06-intrinsic-outage/
│   ├── 07-extrinsic-outage/
│   └── 08-optimization/
├── infra/terraform/                   # all IaC (hub-spoke, AKS, ACR, KV, obs, Front Door)
├── apps/                              # polyglot sample app
│   ├── api-node/                      # Node.js REST API (the "product" service)
│   ├── worker-python/                 # Python background worker (KEDA-scaled)
│   └── web-react/                     # React frontend
├── k8s/                               # raw manifests + kustomize overlays
│   ├── base/
│   └── overlays/{dev,canary,prod}/
├── gitops/                            # Argo CD app-of-apps, ring definitions
├── chaos/                             # Chaos Studio + manual experiments
├── .github/workflows/                 # CI: build, scan, push to ACR, bump GitOps
└── assessment/                        # knowledge check + rubric
```

## Architecture (target end state)

```mermaid
flowchart LR
  user([Customer])
  fd[Azure Front Door + WAF]
  subgraph hub[Hub VNet]
    fw[Azure Firewall]
    bastion[Bastion]
  end
  subgraph eastus2[Spoke: eastus2 - primary]
    aks1[AKS Standard, private API, CNI Overlay, 3 zones]
    acr[ACR zone-redundant]
    kv1[Key Vault]
  end
  subgraph westus3[Spoke: westus3 - passive]
    aks2[AKS Standard, private API, 3 zones]
    kv2[Key Vault]
  end
  obs[Log Analytics + Managed Prometheus + Managed Grafana]
  user --> fd
  fd -->|primary| aks1
  fd -.failover.-> aks2
  aks1 --> acr
  aks2 --> acr
  aks1 --> kv1
  aks2 --> kv2
  hub --- eastus2
  hub --- westus3
  aks1 -.metrics/logs.-> obs
  aks2 -.metrics/logs.-> obs
```

## Conventions used in lab guides

Each module's `README.md` follows the same shape:

1. **Outcomes** — what you'll be able to do
2. **Level target** — L300 baseline + L400 stretch
3. **Whiteboard prompts** — 5-min discussion before keyboards
4. **Steps** — copy-pasteable commands
5. **Validation** — how you know it worked
6. **Stretch (L400)** — optional deeper dives
7. **Cleanup** — only at the end of the workshop; in-module cleanups are explicit

> **Facilitator note:** Anything tagged **[F]** is a facilitator-only callout (gotchas, talking points, when to introduce concepts on the whiteboard).

## Getting started

1. Read [prerequisites.md](prerequisites.md) and complete the **pre-flight** checks.
2. Skim [modules/00-envisioning/README.md](modules/00-envisioning/README.md) the night before.
3. On Day 1 morning, run `infra/terraform/bootstrap.sh` to create the remote-state storage account.

## License

MIT. Sample app and infrastructure are for training only — **not** production-hardened beyond what each module explicitly covers.
