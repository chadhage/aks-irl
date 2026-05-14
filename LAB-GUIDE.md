# Lab Guide — Enterprise-Scale AKS IRL

A self-paced walkthrough. One learner, one desktop, one Azure subscription.

> Read the [Terminology](README.md#terminology--read-this-first) section in the README first. Kubernetes words (Pod, Container, Node, Cluster) always mean Kubernetes objects in this repo.

## How to use this guide

Each step below maps to a module under [`modules/`](modules/). Open the module README in one window; keep this guide in another so you can track progress across the full lab.

For every module:

1. Read the module's **Outcomes** section.
2. Work through the **Steps**.
3. Run the **Validation** before moving on. If validation fails, scroll to the [Troubleshooting playbook](#troubleshooting-playbook) at the bottom.
4. Optionally do the **Stretch (L400)** items if you're aiming for the higher level.

You can pause between modules without losing state — the Terraform-managed infrastructure sits idle until you touch it again. Use the cost-saving snippet in [Module 08](modules/08-optimization/README.md) before long breaks.

---

## Table of contents

- [Phase 0 — Setup](#phase-0--setup)
- [Phase 1 — Plan and provision](#phase-1--plan-and-provision)
- [Phase 2 — Ship the MVP](#phase-2--ship-the-mvp)
- [Phase 3 — Extend and harden](#phase-3--extend-and-harden)
- [Phase 4 — Survive outages](#phase-4--survive-outages)
- [Phase 5 — Optimize and assess](#phase-5--optimize-and-assess)
- [Definition of done per success criterion](#definition-of-done-per-success-criterion)
- [Troubleshooting playbook](#troubleshooting-playbook)
- [Cheat sheet](#cheat-sheet)
- [After the lab](#after-the-lab)

---

## Phase 0 — Setup

1. Complete every check in [prerequisites.md](prerequisites.md).
2. Run `./scripts/preflight.sh` from the repo root and confirm every line is `[OK]`.
3. Fork this repo to your GitHub account and clone the fork locally.
4. `az login` and confirm `az account show` returns your learning subscription.

**Done when** — preflight is green and you can run `az aks list` against your subscription without error.

---

## Phase 1 — Plan and provision

### Module 00 — Envisioning (≈30 min)
📄 [modules/00-envisioning/README.md](modules/00-envisioning/README.md)

- Read the Contoso Storefront brief.
- Make the **9 Day-0 decisions** (Cluster SKU, API access, Pod IPs, mesh, OS, zones, regions, identity, secrets) and write them into `modules/00-envisioning/adr-001-aks-platform.md` using [adr-template.md](modules/00-envisioning/adr-template.md).

**Done when** — your ADR has a decision, a rationale, and at least one rejected alternative per Day-0 question.

**Self-check** — *Name one Day-0 decision you made and the alternative you rejected. What's your SLO and the matching error budget for 30 days?*

### Module 01 — Platform foundation (≈60 min wall-clock)
📄 [modules/01-platform-foundation/README.md](modules/01-platform-foundation/README.md)

1. Provision the Terraform remote-state backend (`infra/terraform/bootstrap/`).
2. Create an Entra app + federated credential for GitHub Actions OIDC.
3. Add the three secrets (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`) to your fork.
4. Copy `infra/terraform/envs/lab/terraform.tfvars.example` → `terraform.tfvars` and fill it in.
5. Run `terraform init`, `terraform plan`, `terraform apply`. Apply takes ~25 minutes — start it and let it run while you read [Module 02](modules/02-cluster-hardening/README.md).

**Done when** — `terraform apply` exits 0 with the full output set (`aks_primary_id`, `acr_login_server`, `frontdoor_endpoint`, …).

**Self-check** — *Why is `local_account_disabled = true` on the Cluster, and what does it cost you?*

### Module 02 — Cluster hardening & access (≈45 min)
📄 [modules/02-cluster-hardening/README.md](modules/02-cluster-hardening/README.md)

- Validate: `az aks command invoke` → `kubectl get nodes -o wide` (3 Nodes, 3 zones).
- Create the User-Assigned Managed Identity for `api-node` and the federated credential with subject `system:serviceaccount:app:api-node`.
- Assign `Key Vault Secrets User` to the UAMI.
- Verify Istio: `kubectl get pods -n aks-istio-system`.

**Done when** — `kubectl get nodes` works, `istiod` and `aks-istio-ingressgateway-external` are `Running`.

**Self-check** — *How is Workload Identity different from the deprecated Pod Identity?*

---

## Phase 2 — Ship the MVP

### Module 03 — MVP go-live (≈2 hr wall-clock)
📄 [modules/03-mvp-go-live/README.md](modules/03-mvp-go-live/README.md)

1. `az acr login` and build/push the three images as `:v1`:
   - `apps/api-node` → `<acr>.azurecr.io/api-node:v1`
   - `apps/worker-python` → `<acr>.azurecr.io/worker-python:v1`
   - `apps/web-react` → `<acr>.azurecr.io/web-react:v1`
2. Bootstrap Argo CD: `kubectl apply -k gitops/bootstrap`.
3. Apply the root app: `kubectl apply -f gitops/apps/root.yaml`.
4. Replace **all** `REPLACE` placeholders in `gitops/` and `k8s/overlays/` with your repo URL and ACR name. Commit + push.
5. Watch `kubectl -n argocd get applications -w` until `ring-dev` and `ring-canary` are **Synced + Healthy**.
6. `curl` your Front Door endpoint → 200 with `"version":"v1"`.
7. Run a load test: `hey -z 30s -c 20 https://<your-fd>.azurefd.net/api/products`.

**Done when** — your Front Door URL serves `web-react` in a browser **and** `/api/products` returns 200 with `"version":"v1"`. Grafana shows the load test as a real spike.

**Self-check** — *List every TLS termination point between a customer browser and a `web-react` Pod.*

🎉 **Success criterion #1 — Live customer — achieved.**

---

## Phase 3 — Extend and harden

### Module 04 — A/B testing with Istio (≈75 min)
📄 [modules/04-ab-testing/README.md](modules/04-ab-testing/README.md)

1. Build & push `api-node:v2`.
2. Deploy v2 alongside v1 (two Deployments, different `version` labels).
3. Update the `VirtualService` for a **90/10 weighted split**. Verify with a curl loop.
4. Switch to **header-based routing** (`x-cohort: beta` → v2). Verify both paths.
5. Open Grafana, split a panel by `version` label, run a load test. **Predict P95 before looking.**
6. Kill-switch drill: revert the `VirtualService` to 100% v1 in under 30 seconds.

**Done when** — Both versions are running, both routing strategies work, Grafana shows the split.

**Self-check** — *Sketch the `match` block to route all customers with header `Authorization` containing `tier=premium` to v2.*

🎉 **Success criterion #2 — A/B testing — achieved.**

### Module 05 — Deployment rings + gates (≈80 min)
📄 [modules/05-deployment-rings/README.md](modules/05-deployment-rings/README.md)

1. Open a small PR (e.g., change a JSON field) → merge.
2. Watch CI build, scan, push `:sha-<short>`.
3. Watch CI **auto-bump** `k8s/overlays/canary/kustomization.yaml`; Argo syncs canary.
4. CI runs the 5-min smoke test → opens a **prod-bump PR**.
5. Approve the prod-bump PR (GitHub Environments protection rule kicks in).
6. After merge, **manually sync** `ring-prod` in the Argo CD UI.
7. Practice **both rollbacks**: (a) Argo CD UI rollback, (b) Git revert PR. Time each.

**Done when** — your change is live in prod **and** you've rolled back at least once.

**Self-check** — *Argo CD rolled prod back to v1, but Git still says v2. Next action, and why?*

🎉 **Success criterion #3 — Rings + gated promotion — achieved.**

---

## Phase 4 — Survive outages

### Module 06 — Intrinsic outage (≈90 min)
📄 [modules/06-intrinsic-outage/README.md](modules/06-intrinsic-outage/README.md)

Set up the "war room" view on your desktop — three things visible at once:

- Live Grafana (success rate + P95 panels)
- `kubectl get pods -n app-prod -w`
- A curl loop hitting your Front Door

Run all three scenarios:

#### Scenario A — Pod kill (6A)
- Loop deleting a random `api-node` Pod every 5 seconds for 60 seconds.
- Watch the success-rate panel: should **not** dip (PDB has `minAvailable: 2`).
- Break the PDB to `minAvailable: 0`, repeat — watch SLO breach. **Restore the PDB.**

#### Scenario B — Bad deploy (6E)
- Push `api-node:bad` that crash-loops or returns 500s.
- Update overlay, watch Argo sync, watch Grafana break.
- Roll back in under 2 minutes (target). Record the time.

#### Scenario C — Zone failure (6D, Chaos Studio)
- Deploy `chaos/zone-failure-experiment.bicep`.
- Start the experiment → an entire zone of Nodes drains.
- Confirm zones 1 + 3 absorb the load, Front Door stays green.

**Done when** — All three scenarios run, you have **one Grafana screenshot per scenario**, and you can answer: *What protected us in each case?*

Write a 5-line incident summary for **one** scenario to `modules/06-intrinsic-outage/incident-<scenario>.md` and commit it.

🎉 **Success criterion #4 — Intrinsic outage survived — achieved.**

### Module 07 — Extrinsic outage + failover (≈90 min wall-clock)
📄 [modules/07-extrinsic-outage/README.md](modules/07-extrinsic-outage/README.md)

1. **Pre-flight**: bootstrap Argo CD on the **secondary Cluster** (westus3) — same steps as Module 03, different Cluster.
2. Verify v1 is running on both Clusters.
3. Run `hey -z 5m -c 50` against Front Door (sustained load).
4. **Surgical failover**: in the Azure portal or via CLI, disable the **primary origin** on Front Door.
5. Measure: how long until traffic shifts? (your **RTO**). How many requests failed during the window? (your **RPO**-adjacent metric for a stateless app).
6. Optionally try the **brutal** version: `az aks stop` on primary. Compare behavior.
7. **Recover**: re-enable origin, but set its weight low first, then ramp.
8. Write your observed RTO/RPO into `modules/07-extrinsic-outage/incident-region.md`.

**Done when** — Failover RTO recorded, recovery done **without** flooding the cold-start primary.

**Self-check** — *Your observed RTO was 90 s, but customer P95 latency stayed elevated for 4 minutes. Why?*

🎉 **Success criterion #5 — Extrinsic outage survived — achieved.**

---

## Phase 5 — Optimize and assess

### Module 08 — Optimization (≈45 min)
📄 [modules/08-optimization/README.md](modules/08-optimization/README.md)

- Turn on the spot pool; add a worker toleration; schedule it on spot.
- Configure KEDA `ScaledObject` to drive the worker `0 → N → 0` based on queue depth.
- Open Grafana, find the **actual** CPU/memory usage of `api-node` over the day.
- Right-size: edit `requests` (and maybe `limits`) in `k8s/base/api-node-deployment.yaml`. Redeploy via Argo. Confirm Pods schedule and pass health checks.

**Done when** — your `api-node` `requests` reflect reality, not guesses.

### Final knowledge check (≈30 min)
📄 [assessment/knowledge-check.md](assessment/knowledge-check.md)

- Answer the questions in `assessment/submissions/answers.md`. Commit and push.
- Sections A–E are required; the L400 extension is **bonus**.
- The rubric ([assessment/rubric.md](assessment/rubric.md)) is open — read it before you start so you know how points are awarded. Grade yourself against it.

**Done when** — your answers file is committed and self-scored against the rubric.

🎉 **Success criterion #6 — Calibrated self-rating — achieved.**

---

## Definition of done per success criterion

| # | Criterion | Done when |
|---|---|---|
| 1 | **Live customer** | Front Door URL serves `web-react` and `/api/products` returns 200 with `"version":"v1"`. |
| 2 | **A/B testing** | v1 + v2 both running; weighted **and** header routing both demonstrated; Grafana split by version. |
| 3 | **Rings + gates** | A PR has flowed through dev → canary → prod with a real approval; rollback executed at least once. |
| 4 | **Intrinsic outage** | At least 2 chaos scenarios run; SLO breach observed and recovered; incident summary committed. |
| 5 | **Extrinsic outage** | Failover RTO recorded; secondary Cluster served traffic; recovery done without overwhelming primary. |
| 6 | **Calibrated rating** | Final assessment committed; self-graded against rubric. |

Track your own progress:
```
[ ] 1. Live customer
[ ] 2. A/B testing
[ ] 3. Rings + gates
[ ] 4. Intrinsic outage
[ ] 5. Extrinsic outage
[ ] 6. Calibrated rating
```

---

## Troubleshooting playbook

### Terraform

| Symptom | Likely cause | Fix |
|---|---|---|
| `AuthorizationFailed` on first apply | OIDC SP missing Owner / wrong subscription | Confirm `subscription_id` in `terraform.tfvars`. Re-check the SP's role assignment. |
| `Microsoft.Cdn` / `Microsoft.OperationalInsights` not registered | Provider not registered in this subscription | `az provider register -n Microsoft.Cdn` (etc.) — then retry. |
| Apply hangs > 30 min on Front Door | Probe configuration not yet propagated | Be patient up to 30 min; if longer, `terraform refresh` and re-plan. |
| `local_account_disabled` blocks `kubectl` | Expected — use `az aks command invoke` or set up Entra-based `kubectl` | See M02 README. |

### Kubernetes / Istio

| Symptom | Fix |
|---|---|
| `kubectl` hangs or "no route to host" | Private API server — use `az aks command invoke` or `scripts/connect-private-aks.sh` |
| Pods stuck `ContainerCreating` | Likely image pull. `kubectl describe pod` → look for `ErrImagePull`. Confirm ACR pull role assignment. |
| Pods `Running` but no Istio sidecar | Namespace missing `istio.io/rev=asm-1-23` label. `kubectl label ns app istio.io/rev=asm-1-23 --overwrite` and re-roll Pods. |
| 503s through Front Door | Health probe failing → check Pod readiness, then Istio gateway, then FD probe path. |

### Argo CD

| Symptom | Fix |
|---|---|
| `ring-dev` stuck `OutOfSync` | Almost always a `REPLACE` placeholder still in `gitops/` or `k8s/overlays/`. `grep -r REPLACE k8s gitops` |
| Argo can't reach Git | Fork is private and no repo secret configured. Either make fork public or add repo creds to Argo. |
| `ring-prod` `OutOfSync` | **By design.** It needs manual sync. |

### GitHub Actions

| Symptom | Fix |
|---|---|
| `AADSTS70021: No matching federated identity record` | OIDC subject mismatch. Check the federated credential's `subject` matches `repo:<owner>/<repo>:ref:refs/heads/main` (or your branch). |
| ACR push 401 | The OIDC SP is missing `AcrPush` on the registry. |

If stuck for more than ~15 minutes on the same error: screenshot the message, re-read the module README from the previous validation step, and read the full error (not just the last line) — the answer is almost always in there.

---

## Cheat sheet

### Connect to the private Cluster (no kubeconfig)
```bash
az aks command invoke \
  --resource-group <rg> --name <aks> \
  --command "kubectl get nodes -o wide"
```

### Reset Argo CD admin password
```bash
kubectl -n argocd patch secret argocd-initial-admin-secret \
  -p '{"data":{"password":"'$(echo -n 'NewPassword!' | base64)'"}}'
```

### Watch a deploy in real time
```bash
kubectl -n app-prod get pods -w &
kubectl -n app-prod logs -f deploy/api-node --tail=50
```

### Curl loop to detect version split
```bash
for i in {1..50}; do
  curl -s https://<fd>.azurefd.net/api/products | jq -r .version
done | sort | uniq -c
```

### Force-resync an Argo app
```bash
argocd app sync ring-dev --prune
# or in the UI: app → Sync → Synchronize
```

### Quick load test
```bash
hey -z 30s -c 20 https://<fd>.azurefd.net/api/products
```

### Find a leftover placeholder
```bash
grep -rn "REPLACE" k8s gitops
```

### Scale to zero for an overnight break
```bash
# In infra/terraform/envs/lab/terraform.tfvars
node_pool_user_min = 0
node_pool_user_max = 0
# then
terraform apply
```

---

## After the lab

- **Keep your fork.** It's your reference architecture for the next 12 months.
- **Tear down billing**: `terraform -chdir=infra/terraform/envs/lab destroy`, then verify in the Azure portal that all resource groups are gone.
- **Read these next** to deepen each success area:
  - [WAF — AKS service guide](https://learn.microsoft.com/azure/well-architected/service-guides/azure-kubernetes-service)
  - [AKS public roadmap](https://aka.ms/aks/roadmap)
  - [Argo CD best practices](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)
  - [Istio ambient mode](https://istio.io/latest/docs/ambient/overview/) — where the mesh story is headed

Drive the platform; don't let it drive you. 🚀
