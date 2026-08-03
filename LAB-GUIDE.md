# Participant Lab Guide — WorkshopPlus

> Your map through the cohort. The trainer drives; you track progress here.

## The apps in this repo are mocks

You are **not** containerizing any real customer code in this workshop. Everything under [`apps/`](apps/) is a **synthetic stand-in** built only to exercise the AKS architecture for a socket-based real-time messaging workload:

| Mock | Stands in for | What it actually does |
|---|---|---|
| `gateway-java` | A Java/Netty TCP gateway terminating long-lived client sockets | Accepts TCP on 4561/4562, speaks a 3-verb protocol (`PING`, `COHORT`, `MSG`), forwards decode work to the parser via REST/JSON over HTTP (mTLS in-mesh), emits Prometheus metrics |
| `parser-cpp` | A C++ message decoder (custom wire-format) | Splits ASCII envelopes, returns JSON; `v1` and `v2` differ only enough to A/B test |
| `ops-console` | A NOC dashboard | Static nginx + a vanilla-JS page polling `/api/metrics` |

The point is the **architecture, controls, and operational moves** — not the application logic. When you finish you will have run a real socket workload at production-grade shape on AKS; swapping in real customer code later is mostly a Dockerfile change.

Read [Terminology](README.md#terminology--read-this-first) before going further. Kubernetes words (Pod, Container, Node, Cluster) always mean Kubernetes objects.

---

## How to use this guide

When the trainer announces a module:

1. Open that module's README; keep this guide in another window for the cross-module map.
2. Listen to the **talk track** while reading **Outcomes**.
3. Watch the **demo cues**.
4. Work the **participant steps**; ping the TA on chat if stuck > 10 min.
5. Run **validation** before the room moves on. If it fails, scroll to [Troubleshooting](#troubleshooting).
6. Early finishers → **Stretch (L400)**.

You can stop between modules without losing state. Use the cost-saving snippet in [Module 08](modules/08-optimization/README.md) before overnight breaks.

---

## The arc — zero to hero

```
M00  decide       →  what shape of AKS for a socket workload?
M01  provision    →  Terraform: VNets, AKS×2, ACR, KV, Postgres Flex, Front Door
M02  identify     →  Workload Identity → Postgres without passwords
M03  ship MVP     →  build 3 images, GitOps sync, first TCP socket lands
M04  A/B parser   →  ship parser v2 to 10% / a header cohort, no socket churn
M05  rings        →  dev → canary → prod with a manual prod gate
M06  intrinsic    →  Pod kill, bad rollout, zone drain — sockets survive
M07  extrinsic    →  cross-region failover, measured RTO/RPO
M08  optimize     →  right-size, spot for parser, KEDA scale-to-zero
```

Each module has a clear validation. If you can run that validation, you are done.

---

## Phase 0 — Setup (before Day 1)

1. Run every check in [prerequisites.md](prerequisites.md).
2. `./scripts/preflight.sh` → every line `[PASS]`.
3. Fork this repo. Clone the fork.
4. `az login` and confirm `az account show` is your lab subscription.
5. Read [SCENARIO.md](SCENARIO.md).

**Done when** — preflight is green and `az aks list` runs without error.

---

## Phase 1 — Plan and provision

### M00 — Envisioning (~45 min)
[modules/00-envisioning/README.md](modules/00-envisioning/README.md)

Walk the 9 Day-0 decisions as a cohort. Commit `modules/00-envisioning/adr-001-aks-platform.md` from [`adr-template.md`](modules/00-envisioning/adr-template.md).

**Done when** — your ADR has a decision, rationale, and rejected alternative per Day-0 question.

**Self-check** — *Name one Day-0 decision and the rejected alternative. State your latency SLO and 30-day error budget.*

### M01 — Platform foundation (~60 min wall-clock)
[modules/01-platform-foundation/README.md](modules/01-platform-foundation/README.md)

1. Bootstrap the Terraform state backend (`infra/terraform/bootstrap/`).
2. Create the GitHub OIDC app + federated credential; add 3 secrets to your fork.
3. `cp terraform.tfvars.example terraform.tfvars`, fill in.
4. `terraform init && terraform plan && terraform apply` (~25 min — trainer uses the wait for M02 concepts).

**Done when** — apply exits 0 with all outputs populated.

**Self-check** — *Why is `local_account_disabled = true` on the cluster, and what does it cost you?*

### M02 — Cluster hardening & identity (~45 min)
[modules/02-cluster-hardening/README.md](modules/02-cluster-hardening/README.md)

- `az aks command invoke` → `kubectl get nodes -o wide` (3 Nodes, 3 zones).
- Create the UAMI for `gateway-java`, federate with subject `system:serviceaccount:messaging:gateway-java`.
- Grant `Key Vault Secrets User` + Postgres Entra connect to the UAMI.
- Confirm `aks-istio-system` Pods Running.

**Done when** — nodes Ready, Istio healthy, throwaway Pod can `az login` via federation.

**Self-check** — *How is Workload Identity different from deprecated Pod Identity, and why does it matter for the gateway's Postgres connection?*

---

## Phase 2 — Ship the MVP

### M03 — MVP go-live (~2 hr including image builds)
[modules/03-mvp-go-live/README.md](modules/03-mvp-go-live/README.md)

1. Build and push all three mock images as `:v1` to your ACR.
2. Apply Argo CD (`kubectl apply -k gitops/bootstrap`); apply the root app.
3. Replace every `REPLACE` placeholder in `gitops/` and `k8s/overlays/`. Commit + push.
4. Watch `kubectl -n argocd get applications -w` until `ring-dev` + `ring-canary` are **Synced + Healthy**. `ring-prod` stays OutOfSync (by design).
5. Smoke test:
   ```bash
   ./scripts/smoke.sh tcp $(terraform output -raw messaging_nlb_ip) 4561 50
   ```
6. Open the ops console at the Front Door URL; confirm the session count climbs as you re-run smoke.

**Done when** — smoke reports `50/50 sessions, 0 dropped, P99 RTT < 250 ms`; ops console shows live sessions.

**Self-check** — *Trace one message from client socket → Postgres journal. List every TLS termination point.*

🎉 **Success #1 — MVP live.**

---

## Phase 3 — Extend and harden

### M04 — A/B testing parser versions (~75 min)
[modules/04-ab-testing/README.md](modules/04-ab-testing/README.md)

1. Build and push `parser-cpp:v2`.
2. Deploy v2 alongside v1.
3. Update the `VirtualService` for a 90/10 weighted split. Verify with synthetic loops.
4. Switch to header-based routing (`x-cohort: beta` → v2).
5. Grafana panel split by `parser_version` — predict P99 before looking.
6. Kill-switch drill: revert to 100% v1 in < 30 s.

**Done when** — both versions running, both routing modes work, Grafana shows the split.

**Self-check** — *Sketch a `match` block routing connection-IDs ending in odd hex digits to v2.*

🎉 **Success #2 — A/B parser tested.**

### M05 — Rings + gates (~80 min)
[modules/05-deployment-rings/README.md](modules/05-deployment-rings/README.md)

1. PR a tiny real change → merge.
2. CI builds, scans, pushes `:sha-<short>`.
3. CI auto-bumps canary kustomization; Argo syncs canary.
4. CI runs the socket-soak; opens a prod-bump PR.
5. Approve the PR (Environments protection rule).
6. **Manually sync** `ring-prod` in the Argo UI.
7. Practice both rollbacks: Argo UI rollback, Git revert PR. Time each.

**Done when** — your change is live in prod and you've rolled back at least once.

**Self-check** — *Argo rolled prod back to v1, but Git still says v2. Next action, and why?*

🎉 **Success #3 — Rings + gated promotion.**

---

## Phase 4 — Survive outages

### M06 — Intrinsic outage (~90 min, war-room)
[modules/06-intrinsic-outage/README.md](modules/06-intrinsic-outage/README.md)

Set up three panes: Grafana (session success + RTT P99), `kubectl get pods -n messaging-prod -w`, and a sustained socket generator.

- **A — Parser Pod kill loop.** RTT should not spike (PDB + mesh retries). Break PDB, watch SLO break, **restore PDB**.
- **B — Bad parser rollout** (`parser-cpp:bad`). Target rollback < 2 min. Record actual.
- **C — Zone drain** via [`chaos/zone-failure-experiment.bicep`](chaos/zone-failure-experiment.bicep). Watch the reconnect storm hit the surviving zones; confirm ≥ 99% reconnect within 30 s.

**Done when** — all three scenarios run, one Grafana screenshot per scenario, one incident write-up committed.

🎉 **Success #4 — Intrinsic outage survived.**

### M07 — Extrinsic outage + cross-region failover (~90 min)
[modules/07-extrinsic-outage/README.md](modules/07-extrinsic-outage/README.md)

1. Bootstrap Argo on the secondary cluster (same as M03, different cluster).
2. Verify Postgres geo-replica lag < 5 s.
3. Sustained socket load against primary NLB.
4. Surgical failover: swap the messaging DNS record from primary → secondary NLB. Promote the Postgres replica.
5. Measure: socket-reconnect RTO, message RPO.
6. Optional: brutal `az aks stop` on primary. Compare.
7. Recover to primary without flooding it.

**Done when** — RTO/RPO recorded, recovery clean, no Postgres split-brain.

**Self-check** — *Reconnect RTO was 90 s but P99 RTT stayed elevated for 4 min after. Why?*

🎉 **Success #5 — Extrinsic outage survived.**

---

## Phase 5 — Optimize and assess

### M08 — Optimization (~45 min)
[modules/08-optimization/README.md](modules/08-optimization/README.md)

- Enable the spot pool; move parser batch reconciler to it with the right toleration.
- KEDA `ScaledObject` drives `parser-cpp` `0 → N → 0` by Prometheus signal.
- Right-size `gateway-java` requests from Grafana's actual P95 usage. Roll out **without** churning sockets.

**Done when** — right-sized requests reflect reality and the rollout did not drop the baseline session count.

### Final knowledge check (~30 min)
[assessment/knowledge-check.md](assessment/knowledge-check.md)

Answer in `assessment/submissions/answers.md`. Sections A–E required, F is bonus. Read [`rubric.md`](assessment/rubric.md) first; self-grade after.

🎉 **Success #6 — Calibrated self-rating.**

---

## Definition of done — track yourself

```
[ ] 1. MVP live                — TCP socket accepted, parser decodes, ops console live
[ ] 2. A/B parser              — v1 + v2 both running, weighted + header routes, Grafana split
[ ] 3. Rings + gates           — PR flowed dev → canary → prod with approval, ≥ 1 rollback done
[ ] 4. Intrinsic outage        — ≥ 2 chaos scenarios run, incident written
[ ] 5. Extrinsic outage        — RTO/RPO recorded, clean recovery, no split-brain
[ ] 6. Calibrated rating       — assessment committed, self-graded
```

---

## Troubleshooting

### Terraform
| Symptom | Fix |
|---|---|
| `AuthorizationFailed` on first apply | Confirm `subscription_id` in tfvars; re-check OIDC SP roles |
| `Microsoft.DBforPostgreSQL` not registered | `az provider register -n Microsoft.DBforPostgreSQL` and retry |
| Apply hangs on Postgres Flex Server | Capacity in that zone — change `postgres_zone` in tfvars |
| `kubectl` blocked by `local_account_disabled` | Use `az aks command invoke` or set up Entra `kubectl`; see M02 |

### Kubernetes / Istio
| Symptom | Fix |
|---|---|
| `kubectl` hangs / no route | Private API server — use `az aks command invoke` or `scripts/connect-private-aks.sh` |
| Pods `ContainerCreating` forever | Image pull. `kubectl describe pod`; confirm ACR pull role on Kubelet identity |
| Pods Running but no Istio sidecar | Namespace missing `istio.io/rev=asm-1-23`; label and re-roll Pods |
| Gateway readiness fails, sockets drop | Check logs — usually Workload Identity federated-credential subject mismatch |
| Sockets drop at exactly 30 min | NLB idle timeout — annotation `service.beta.kubernetes.io/azure-load-balancer-tcp-idle-timeout: "30"` (minutes) |

### Argo CD
| Symptom | Fix |
|---|---|
| `ring-dev` stuck `OutOfSync` | `grep -rn REPLACE k8s gitops` — leftover placeholder |
| Argo can't reach Git | Private fork without repo creds in Argo — make public or add creds |
| `ring-prod` `OutOfSync` | **By design.** Manual sync. |

### GitHub Actions
| Symptom | Fix |
|---|---|
| `AADSTS70021: No matching federated identity` | Subject mismatch on the federated credential; should match `repo:<owner>/<repo>:ref:refs/heads/main` |
| ACR push 401 | OIDC SP missing `AcrPush` on the registry |

Stuck > 15 min on the same error: screenshot, re-read the previous validation step, ping the TA.

---

## Cheat sheet

```bash
# Reach the private cluster (no kubeconfig)
az aks command invoke -g <rg> -n <aks> --command "kubectl get nodes -o wide"

# Reset Argo admin password
kubectl -n argocd patch secret argocd-initial-admin-secret \
  -p '{"data":{"password":"'$(echo -n 'NewPassword!' | base64)'"}}'

# Watch a deploy
kubectl -n messaging-prod get pods -w &
kubectl -n messaging-prod logs -f sts/gateway-java --tail=50

# Detect parser version split from the client side
./scripts/smoke.sh tcp $NLB_IP 4561 50 --duration 10s --json-output evidence/parser-split.json

# Force-resync an Argo app
argocd app sync ring-dev --prune

# Quick socket soak
./scripts/smoke.sh tcp $NLB_IP 4561 200 --duration 60s

# Find leftover placeholders
grep -rn REPLACE k8s gitops

# Park clusters for overnight (keeps Postgres + ACR)
# in terraform.tfvars: node_pool_user_min = 0; node_pool_user_max = 0
terraform apply
```

---

## After the workshop

- **Keep your fork** — it is your reference architecture and your single best engagement artifact.
- **Stop billing**: `terraform -chdir=infra/terraform/envs/lab destroy`; confirm in the portal that RGs **and Postgres backups** are gone.
- **Read next**:
  - [WAF — AKS service guide](https://learn.microsoft.com/azure/well-architected/service-guides/azure-kubernetes-service)
  - [WAF — Azure DB for PostgreSQL Flexible Server](https://learn.microsoft.com/azure/well-architected/service-guides/postgresql)
  - [AKS public roadmap](https://aka.ms/aks/roadmap)
  - [Argo CD operator manual](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)
  - [Istio ambient mode](https://istio.io/latest/docs/ambient/overview/)
