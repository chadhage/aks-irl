# Student Guide — Enterprise-Scale AKS IRL

Welcome. Over the next two days you and your pod will take a real application from **a napkin sketch to a live customer**, then **A/B test it, ring it through dev → canary → prod, survive two outages, and optimize it**. You'll leave with a calibrated rating (high L200, L300, or L400) and — more importantly — the muscle memory to do this back at work.

> This guide is **yours**. Read it before each block, scribble in it, and use the checklists to keep yourself unblocked. Your facilitator is running [DELIVERY-GUIDE.md](DELIVERY-GUIDE.md) — you don't need to read that one.

---

## Table of contents
- [Before you arrive](#before-you-arrive)
- [How the workshop runs](#how-the-workshop-runs)
- [Your pod, your responsibilities](#your-pod-your-responsibilities)
- [Working remotely without burning out](#working-remotely-without-burning-out)
- [Day 1 walkthrough](#day-1-walkthrough)
- [Day 2 walkthrough](#day-2-walkthrough)
- [Knowledge checks — what to expect](#knowledge-checks--what-to-expect)
- [Troubleshooting playbook](#troubleshooting-playbook)
- [Definition of done per success criterion](#definition-of-done-per-success-criterion)
- [Cheat sheet](#cheat-sheet)
- [After the workshop](#after-the-workshop)

---

## Before you arrive

Do all of this **before Day 1**. If something is red, post in the workshop channel — don't wait.

### Tooling (≥ these versions)
- [ ] Azure CLI ≥ 2.65
- [ ] Terraform ≥ 1.9
- [ ] `kubectl` ≥ 1.30
- [ ] `helm` ≥ 3.15
- [ ] `git`, `docker` (or Podman), `jq`, `curl`
- [ ] An editor with Markdown + HCL support (VS Code recommended)

### Accounts and access
- [ ] Azure subscription with at least **50 vCPU quota in your assigned region**
- [ ] You are **Owner** on at least one resource group (or the subscription)
- [ ] GitHub account; ability to **fork** the workshop repo to your account or org
- [ ] Mic and **camera** working in Teams/Zoom

### Repo
```bash
# Fork https://github.com/chhage_microsoft/enterprise-scale-aks-irl in the GitHub UI, then:
git clone https://github.com/<your-user>/enterprise-scale-aks-irl.git
cd enterprise-scale-aks-irl
./scripts/preflight.sh
```
All `[OK]` lines green? You're ready.

### Mindset
- You will get stuck. **That's the point.** Every stick is a teaching moment.
- Talk in chat early. Lurking burns your own time.
- Read the **module README** for the block you're about to start — not the whole workshop.

---

## How the workshop runs

- **2 days × ~8 hours** with lunch + two breaks per day.
- Each **block is 60–90 minutes** and follows the same shape:
  1. Lead frames the goal (3–5 min)
  2. Lead demos the hardest step live (10–15 min)
  3. **You and your pod** do it in breakouts (20–30 min)
  4. Reconvene, share screenshots, debug edge cases (10–15 min)
  5. **Knowledge check** in chat (2–5 min)
  6. Q&A (2–5 min)
- **You'll spend most of your time in your pod breakout room, not in the main room.** That's the design.

> 📅 Full block schedule and exact timings live in [DELIVERY-GUIDE.md](DELIVERY-GUIDE.md). You don't need to memorize it — facilitators will herd you in and out of breakouts.

---

## Your pod, your responsibilities

You'll be assigned to a pod of **2–3 people** with a shared breakout room.

### Rotating roles (rotate every block)
| Role | Responsibility |
|---|---|
| **Driver** | Hands on keyboard. Shares screen in the breakout. |
| **Navigator** | Reads the module README, calls out steps, watches for typos. |
| **Observer** *(if 3-person pod)* | Owns Grafana / logs / chat in the main room. Speaks for the pod when called on. |

Rotate roles **every block**, no exceptions. Each person should drive `terraform`, `kubectl`, and `git` at least once.

### Pod hygiene
- One person commits to git; the rest pull. Don't fight over branches.
- Use a shared scratchpad (Teams channel, OneNote, or a `notes.md` in the repo) for commands you'll reuse.
- If you fall behind, **say so in main chat at the next reconvene** — TAs will help.

---

## Working remotely without burning out

This is a packed two days. Protect your focus.

- **Cameras on** during lectures. They can be off in breakouts.
- **One reaction emoji** = signal: ✅ "I'm done" · ✋ "I'm stuck" · 🤔 "I have a question"
- **5-minute rule**: stuck for 5 minutes? Drop "stuck" in main chat with what step you're on. A TA will hop into your breakout.
- **Don't suffer silently** debugging Terraform errors past 10 minutes — the answer is almost always in the error message, but a fresh pair of eyes finds it in 60 seconds.
- **Hydrate**, take both breaks fully, step away at lunch. We engineered the schedule around it.

---

## Day 1 walkthrough

### Block 0 — Kickoff (30 min)
**What you'll do**
- Meet your pod, claim your breakout room
- Run `./scripts/preflight.sh` and resolve any reds
- Pre-flight knowledge check in chat: *"Why does an AKS cluster have a system node pool?"*

**Done when** — preflight is green, you know your pod-mates' names.

---

### Block 1 — M00 Envisioning & whiteboarding (60 min) 📄 [modules/00-envisioning/README.md](modules/00-envisioning/README.md)
**What you'll do**
- Read the Contoso Storefront brief out loud in your pod
- Fill in your pod's whiteboard frame: **9 Day-0 decisions** (cluster SKU, API access, pod IPs, mesh, OS, zones, regions, identity, secrets)
- Draft `adr-001-aks-platform.md` using `modules/00-envisioning/adr-template.md`
- Two pods present to the room; everyone heckles (politely)

**Done when** — your ADR has a decision, a rationale, and at least one alternative per Day-0 question.

**Knowledge check** — *"Name one Day-0 decision you made and the alternative you rejected. What's your SLO and the matching error budget for 30 days?"*

---

### Block 2 — M01 part 1: Bootstrap + start `terraform apply` (80 min) 📄 [modules/01-platform-foundation/README.md](modules/01-platform-foundation/README.md)
**What you'll do**
1. Receive your pod's OIDC service-principal creds from the facilitator (DM)
2. Set GitHub repo secrets (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`)
3. Copy `terraform.tfvars.example` → `terraform.tfvars`, fill in pod-specific values
4. `terraform init`, `terraform plan`, `terraform apply` — **then walk away while it runs (~25 min)**
5. **While apply runs**, read [modules/02-cluster-hardening/README.md](modules/02-cluster-hardening/README.md)

**Common gotchas** — see [Troubleshooting playbook](#troubleshooting-playbook) below.

**Done when** — `terraform apply` is running. You don't need it to finish in this block.

**Knowledge check** — *"Why is `local_account_disabled = true` on the cluster, and what does it cost you?"*

> ☕ Lunch happens here. Your apply will be finishing while you eat.

---

### Block 3 — M01 validate + M02 hardening (60 min) 📄 [modules/02-cluster-hardening/README.md](modules/02-cluster-hardening/README.md)
**What you'll do**
- Validate the platform: `az aks command invoke` → `kubectl get nodes -o wide` (3 nodes, 3 zones)
- Create the User-Assigned Managed Identity for `api-node`
- Create the federated credential with subject `system:serviceaccount:app:api-node`
- Assign `Key Vault Secrets User` to the UAMI
- Verify Istio injection: `kubectl get pods -n aks-istio-system`

**Done when** — `kubectl get nodes` works, `istiod` and `aks-istio-ingressgateway-external` pods are `Running`.

**Knowledge check** — *"How is Workload Identity different from the deprecated Pod Identity?"*

---

### Block 4 — M03 part 1: Build, push, GitOps (90 min) 📄 [modules/03-mvp-go-live/README.md](modules/03-mvp-go-live/README.md)
**What you'll do**
1. `az acr login` and build/push the three images as `:v1`:
   - `apps/api-node` → `<acr>.azurecr.io/api-node:v1`
   - `apps/worker-python` → `<acr>.azurecr.io/worker-python:v1`
   - `apps/web-react` → `<acr>.azurecr.io/web-react:v1`
2. Bootstrap Argo CD: `kubectl apply -k gitops/bootstrap`
3. Apply the root app: `kubectl apply -f gitops/apps/root.yaml`
4. Replace **all** `REPLACE` placeholders in `gitops/` and `k8s/overlays/` with your repo URL and ACR name. Commit + push.
5. Watch `kubectl -n argocd get applications -w` until `ring-dev` and `ring-canary` are **Synced + Healthy**

**Done when** — Two rings green. `ring-prod` is `OutOfSync` (that's correct — you'll sync it manually later).

**Knowledge check** — *"Why is `ring-prod` permanently OutOfSync right now? Is that a bug?"*

---

### Block 5 — M03 part 2: Live customer + load test (65 min) 📄 [modules/03-mvp-go-live/README.md](modules/03-mvp-go-live/README.md)
**What you'll do**
- `curl` your Front Door endpoint → 200 with `"version":"v1"`
- Open your storefront in a browser
- Run a load test: `hey -z 30s -c 20 https://<your-fd>.azurefd.net/api/products`
- Watch Grafana fill with timeseries; take a **screenshot** (saved to `pod-notes/` or your scratchpad)

**Done when** — A teammate on a different network confirms they hit your URL.

**Knowledge check** — *"List every TLS termination point between a customer browser and a `web-react` pod."*

🎉 **Success criterion #1 — Live customer — achieved.**

---

### Block 6 — Day-1 mini check + retro (15 min)
- Three rapid-fire questions in chat (your scribe will grade)
- Each pod drops one **+** (what worked) and one **Δ** (what to change) in chat
- Homework: skim Modules 04 and 06 tonight (15 min each, max)
- **Leave your cluster running.** You can scale `node_pool_user` to `min=1` if cost-sensitive — `terraform.tfvars` then `terraform apply`.

---

## Day 2 walkthrough

### Block 0 — Re-entry (15 min)
- `kubectl get nodes` — still alive?
- `curl https://<your-fd>.azurefd.net/api/products` — still 200?
- If red: TA will join your breakout. Don't panic — overnight breakage is normal and instructive.

---

### Block 1 — M04 A/B testing (75 min) 📄 [modules/04-ab-testing/README.md](modules/04-ab-testing/README.md)
**What you'll do**
1. Build & push `api-node:v2` (change `APP_VERSION=v2` in the Deployment; optionally tweak a response field)
2. Deploy v2 alongside v1 (both Deployments live in the same namespace with different `version` labels)
3. Update the VirtualService for a **90/10 weighted split**. Verify with a curl loop.
4. Switch to **header-based routing** (`x-cohort: beta` → v2). Verify both paths.
5. Open Grafana, split a panel by `version` label. Run a load test. **Predict P95 before looking.**
6. Kill-switch drill: revert VS to 100% v1 in under 30 seconds.

**Done when** — Both versions are running, both routing strategies work, Grafana shows the split.

**Knowledge check** — *"Sketch the `match` block to route all customers with header `Authorization` containing `tier=premium` to v2."*

🎉 **Success criterion #2 — A/B testing — achieved.**

---

### Block 2 — M05 Deployment rings (80 min) 📄 [modules/05-deployment-rings/README.md](modules/05-deployment-rings/README.md)
**What you'll do**
1. Open a tiny PR (e.g., change a JSON field) → merge
2. Watch CI build, scan, push `:sha-<short>`
3. Watch CI **auto-bump** `k8s/overlays/canary/kustomization.yaml`, Argo sync canary
4. CI runs the 5-min smoke test → opens a **prod-bump PR**
5. Review + approve the prod-bump PR (GH Environments protection rule kicks in)
6. After merge, **manually sync** `ring-prod` in Argo CD UI
7. Then practice **both rollbacks**: (a) Argo CD UI rollback, (b) Git revert PR. Time each.

**Done when** — Your change is live in prod **and** you've rolled back at least once.

**Knowledge check** — *"Your Argo CD rolled prod back to v1, but Git still says v2. Next action, and why?"*

🎉 **Success criterion #3 — Rings + gated promotion — achieved.**

---

### Block 3 — M06 Intrinsic outage (90 min) 📄 [modules/06-intrinsic-outage/README.md](modules/06-intrinsic-outage/README.md)
**Set up the "war room" view in your pod breakout** — three things visible at once:
- Live Grafana (success rate + P95 panels)
- `kubectl get pods -n app-prod -w`
- A curl loop hitting your Front Door

**You will run three scenarios** (or the two the facilitator picks):

#### Scenario A — Pod kill (6A)
- Run a loop deleting a random `api-node` pod every 5 seconds for 60 seconds
- Watch the success-rate panel: should **not** dip (PDB has `minAvailable: 2`)
- Now break the PDB to `minAvailable: 0`, repeat — watch SLO breach. **Restore the PDB.**

#### Scenario B — Bad deploy (6E)
- Push `api-node:bad` that crash-loops or returns 500s
- Update overlay, watch Argo sync, watch Grafana break
- Roll back in under 2 minutes (target). Record the time.

#### Scenario C — Zone failure (6D, Chaos Studio)
- Deploy `chaos/zone-failure-experiment.bicep`
- Start the experiment → entire zone of nodes drains
- Confirm zones 1 + 3 absorb the load, Front Door stays green

**Done when** — All three scenarios run, you have **one Grafana screenshot per scenario**, and you can answer: "What protected us in each case?"

**Homework** — Write a 5-line incident summary for **one** scenario to `modules/06-intrinsic-outage/incident-<scenario>.md`. Commit before Day 3 morning (i.e., tonight).

🎉 **Success criterion #4 — Intrinsic outage survived — achieved.**

---

### Block 4 — M07 Extrinsic outage + failover (75 min) 📄 [modules/07-extrinsic-outage/README.md](modules/07-extrinsic-outage/README.md)
**What you'll do**
1. **Pre-flight**: bootstrap Argo CD on the **secondary cluster** (westus3) — same steps as Day 1 Block 4, different cluster
2. Verify v1 is running on both clusters
3. Run `hey -z 5m -c 50` against Front Door (sustained load)
4. **Surgical failover**: in Azure portal or via CLI, disable the **primary origin** on Front Door
5. Measure: how long until traffic shifts? (your **RTO**). How many requests failed during the window? (your **RPO**-adjacent metric for a stateless app).
6. Optionally try the **brutal** version: `az aks stop` on primary. Compare behavior.
7. **Recover**: re-enable origin, but set its weight low first, then ramp.

**Done when** — Failover RTO recorded, recovery done **without** flooding the cold-start primary.

**Knowledge check** — *"Your observed RTO was 90 s, but customer P95 latency stayed elevated for 4 min. Why?"*

🎉 **Success criterion #5 — Extrinsic outage survived — achieved.**

---

### Block 5 — M08 Optimization (35 min, compressed) 📄 [modules/08-optimization/README.md](modules/08-optimization/README.md)
**What you'll watch the lead demo**
- Spot pool turn-on, worker toleration, scheduling on spot
- KEDA `ScaledObject` driving the worker 0 → N → 0 based on queue depth

**What you'll do in breakouts**
- Open Grafana, find the **actual** CPU/memory usage of `api-node` over the day
- Right-size: edit `requests` (and maybe `limits`) in `k8s/base/api-node-deployment.yaml`
- Redeploy via Argo. Confirm pods schedule and pass health checks.

**Done when** — Your `api-node` `requests` reflect reality, not guesses.

---

### Block 6 — Final knowledge check + close (30 min) 📄 [assessment/knowledge-check.md](assessment/knowledge-check.md)
- **25 minutes silent work.** Answer in `assessment/submissions/<your-name>/answers.md`. Commit, push.
- Sections A–E are required; the L400 extension is **bonus**, attempt it only if you've finished A–E.
- The rubric ([assessment/rubric.md](assessment/rubric.md)) is **open** — read it before you start so you know how points are awarded.

**Done when** — Your answers file is committed and pushed.

🎉 **Success criterion #6 — Calibrated rating — achieved** (you'll get your level within 24 h).

---

## Knowledge checks — what to expect

You'll see **12 short checks** across the workshop plus the final assessment. They are designed to **diagnose, not punish** — your facilitator uses the answers to decide where to slow down.

| When | Format | How long |
|---|---|---|
| End of every block | 1 chat question, 1–3 sentences | 1–3 min |
| End of M06 | Incident summary, commit to repo | Overnight homework |
| End of Day 2 | Final markdown assessment, sections A–F | 25 min |

**Tips**
- Be concise. A 2-sentence right answer beats a paragraph of vague.
- If you don't know, say **"I don't know, but I'd find out by …"** — that's an L300 answer and earns partial credit.
- Tie answers to **what you actually did** in your pod when you can.

---

## Troubleshooting playbook

### Terraform

| Symptom | Likely cause | Fix |
|---|---|---|
| `AuthorizationFailed` on first apply | OIDC SP missing Owner / wrong subscription | Confirm `subscription_id` in `terraform.tfvars`. Re-check the SP's role assignment. |
| `Microsoft.Cdn` / `Microsoft.OperationalInsights` not registered | Provider not registered in this subscription | `az provider register -n Microsoft.Cdn` (etc.) — then retry. |
| `subnet address space overlap` | Two pods using same CIDR | Change `vnet_address_space` and `subnet_*` in your tfvars; pods get unique `/20`s. |
| Apply hangs > 30 min on Front Door | Probe configuration not yet propagated | Be patient up to 30 min; if past that, TA. |
| `local_account_disabled` blocks `kubectl` | Expected — use `az aks command invoke` or set up Entra-based `kubectl` | See M02 README. |

### Kubernetes / Istio

| Symptom | Fix |
|---|---|
| `kubectl` hangs or "no route to host" | Private API server — use `az aks command invoke` or `connect-private-aks.sh` |
| Pods stuck `ContainerCreating` | Likely image pull. `kubectl describe pod` → look for `ErrImagePull`. Confirm ACR pull role assignment. |
| Pods `Running` but no Istio sidecar | Namespace missing `istio.io/rev=asm-1-23` label. `kubectl label ns app istio.io/rev=asm-1-23 --overwrite` and re-roll pods. |
| 503s through Front Door | Health probe failing → check pod readiness, then Istio gateway, then FD probe path. |

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
| ACR push 401 | The OIDC SP missing `AcrPush` on the registry. |

When stuck > 5 min: **drop in main chat with "stuck on `<step>`"** and screenshot the error. Don't guess for 20 minutes.

---

## Definition of done per success criterion

| # | Criterion | Done when |
|---|---|---|
| 1 | **Live customer** | Front Door URL serves `web-react` and `/api/products` returns 200 with `"version":"v1"`. |
| 2 | **A/B testing** | v1 + v2 both running; weighted **and** header routing both demonstrated; Grafana split by version. |
| 3 | **Rings + gates** | A PR has flowed through dev → canary → prod with a real human approval; rollback executed at least once. |
| 4 | **Intrinsic outage** | At least 2 chaos scenarios run; SLO breach observed and recovered; incident summary committed. |
| 5 | **Extrinsic outage** | Failover RTO recorded; secondary cluster served traffic; recovery done without overwhelming primary. |
| 6 | **Calibrated rating** | Final assessment committed; rating returned within 24 h. |

Track your own progress here:
```
[ ] 1. Live customer
[ ] 2. A/B testing
[ ] 3. Rings + gates
[ ] 4. Intrinsic outage
[ ] 5. Extrinsic outage
[ ] 6. Calibrated rating
```

---

## Cheat sheet

### Connect to a private cluster (no kubeconfig)
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

---

## After the workshop

- **Keep your fork.** It's your reference architecture for the next 12 months.
- **Tear down billing**: facilitators will run `terraform destroy`, but verify your own resource groups are gone in the portal.
- **Read these next** to deepen each success area:
  - [WAF — AKS service guide](https://learn.microsoft.com/azure/well-architected/service-guides/azure-kubernetes-service)
  - [AKS public roadmap](https://aka.ms/aks/roadmap)
  - [Argo CD best practices](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)
  - [Istio ambient mode](https://istio.io/latest/docs/ambient/overview/) — where the mesh story is headed
- **Try this at home**: replicate your pod's setup in your own subscription using `infra/terraform/envs/pod-template`. Skip the OIDC complexity by running `terraform apply` locally with `az login`.
- **Got promoted to platform owner?** [FACILITATOR.md](FACILITATOR.md) explains how to run this workshop for your team.

Good luck. Drive the platform; don't let it drive you. 🚀
