# Delivery Guide — Enterprise-Scale AKS IRL

> Turn-by-turn facilitator script for **remote delivery over Microsoft Teams or Zoom**. Every block is sized **60–90 minutes** with built-in Q&A, energizers, and short knowledge checks. Read this end-to-end at least once before delivering.

**Audience:** L200 AKS practitioners.
**Cohort:** 6–24 participants in **squads** of 2–3.
**Format:** 2 days × ~8 hours, fully remote.
**Companion docs:** [README.md](README.md), [FACILITATOR.md](FACILITATOR.md), [STUDENT-GUIDE.md](STUDENT-GUIDE.md), [modules/](modules/).

> **Terminology (enforce on screen and in chat).** Kubernetes words are reserved for Kubernetes objects. A **Pod** is a K8s Pod, a **Node** is a K8s Node (not Node.js), a **Container** is a K8s container (not ACR / ACA / a Docker container on a laptop), a **Cluster** is an AKS Cluster. A workshop **squad** is 2–3 participants sharing a breakout room and one Terraform environment. Correct any drift early — ambiguity here costs minutes for the rest of the workshop.

---

## How to use this guide

Each block follows the same anatomy so you (and any co-facilitator) can pick up mid-stream:

```
BLOCK N — <title>                                   ⏱ minutes
────────────────────────────────────────────────────
GOAL          one sentence
SETUP         what to share on screen, what links to drop
RUN           turn-by-turn script (T0, T+5, T+12 ...)
CHECK         knowledge-check question(s)
Q&A           timeboxed
HANDOFF       what the next block expects from this one
```

`T+N` = N minutes after the block starts. Stay within ±2 min of these markers; if you slip, **cut a stretch goal, never the knowledge check**.

---

## Remote delivery operating model

### Tools and channels (set up before Day 1)
| Channel | Purpose | Owner |
|---|---|---|
| **Teams/Zoom main room** | Lectures, demos, Q&A | Lead |
| **Breakout rooms (1 per squad)** | Squad work; participants live in their squad room | TAs |
| **Persistent chat** | Links, commands, "I'm stuck" pings | Lead |
| **Shared whiteboard** (Mural, Miro, Whiteboard) | M00 architecture sketch, M06 incident timelines | Lead |
| **GitHub Discussions or Teams channel** | Async Q&A, parking-lot questions | Scribe |
| **Lucid/Drawio link** | Reference architecture diagram (kept open) | Lead |

### Facilitator team
- **Lead** — drives time, lectures, runs the demo. Camera on, screen-sharing.
- **TA(s)** — one per **6 participants minimum**. Hops between breakout rooms, watches the persistent chat, owns "unstuck within 5 minutes".
- **Scribe** — captures parking-lot questions, knowledge-check answers in chat, end-of-day retro notes.

### Camera, mic, and chat etiquette (announce at T0 of Day 1)
- Cameras on during lectures, optional during hands-on
- One reaction emoji = "I'm done" (green check) / "I'm stuck" (raised hand)
- Type questions in chat anytime; lead will batch them at Q&A
- TAs DM "do you want a screenshare?" before joining a stuck squad's breakout

### Remote anti-patterns to avoid
- ❌ Reading slides aloud — replace with **live terminal** + **whiteboard sketch**
- ❌ 90 min of lecture before any hands-on — every block has **a hands-on within first 20 min**
- ❌ Surprise quizzes — every knowledge check is **announced** in the prior block
- ❌ Ignoring the chat — **every 10 min you mention "anything in chat?"**
- ❌ One big breakout for all hands-on — **timebox 15–25 min**, then come back

### The 5-minute rule
A participant or squad stuck for **5 minutes** triggers an automatic TA assist. TAs scan reactions/chat every 2–3 min. If a squad is stuck on infrastructure, **skip ahead** to the next module's *prep* steps so they don't lose time.

---

## Day 1 schedule — From napkin to live customer

> Times are wall-clock; assume **09:00 local** start. Adjust the lunch position to your cohort's timezone.

| Block | Time | Length | Title |
|---|---|---|---|
| D1-B0 | 09:00–09:30 | 30 | Kickoff, ground rules, L200 baseline check |
| D1-B1 | 09:30–10:30 | 60 | **M00 — Envisioning & whiteboarding** |
| Break | 10:30–10:40 | 10 | Stretch |
| D1-B2 | 10:40–12:00 | 80 | **M01 part 1 — Bootstrap + start `terraform apply`** |
| Lunch | 12:00–13:00 | 60 | |
| D1-B3 | 13:00–14:00 | 60 | **M01 part 2 — Validate platform** + **M02 — Hardening** |
| D1-B4 | 14:00–15:30 | 90 | **M03 part 1 — Build & push, bootstrap Argo CD** |
| Break | 15:30–15:40 | 10 | |
| D1-B5 | 15:40–16:45 | 65 | **M03 part 2 — Live customer + load test** |
| D1-B6 | 16:45–17:00 | 15 | **Day-1 knowledge check + retro** |

---

## Day 2 schedule — Extend, ring, survive, optimize

| Block | Time | Length | Title |
|---|---|---|---|
| D2-B0 | 09:00–09:15 | 15 | Re-entry + Day-1 review |
| D2-B1 | 09:15–10:30 | 75 | **M04 — A/B testing with Istio** |
| Break | 10:30–10:40 | 10 | |
| D2-B2 | 10:40–12:00 | 80 | **M05 — Deployment rings + gates** |
| Lunch | 12:00–13:00 | 60 | |
| D2-B3 | 13:00–14:30 | 90 | **M06 — Intrinsic outage** (3 scenarios) |
| Break | 14:30–14:40 | 10 | |
| D2-B4 | 14:40–15:55 | 75 | **M07 — Extrinsic outage + failover** |
| D2-B5 | 15:55–16:30 | 35 | **M08 — Optimization** (compressed) |
| D2-B6 | 16:30–17:00 | 30 | **Final knowledge check + close + cleanup** |

---

# Day 1

## D1-B0 — Kickoff (30 min)

```
GOAL    Shared expectations, working tooling, L200 baseline confirmed.
SETUP   Share screen on this Delivery Guide table of contents.
        Drop in chat: repo URL, prerequisites.md, your cohort's squad assignment grid.
```

### RUN
- **T0 (5 min)** — Welcome. State the **promise**: "By the end of tomorrow you will have taken an MVP from a napkin to a live customer behind Front Door, A/B tested it, survived an outage in each direction, and earned a level rating."
- **T+5 (5 min)** — Logistics: cameras/chat/breakouts (above). Show the breakout-room layout. Each squad claims a room.
- **T+10 (5 min)** — Tour the repo live: `README.md` → `modules/` → `infra/terraform/`. Don't deep-dive; just orient.
- **T+15 (10 min)** — **Pre-flight check in breakouts.** Squads run `./scripts/preflight.sh`. TAs visit each room.
- **T+25 (3 min)** — Back in main room. Lead asks: "Anyone red?" Fix the top 1–2 issues live.
- **T+28 (2 min)** — Preview D1-B1. Q&A.

### CHECK (in chat, 1 min)
> "In one sentence, why does an AKS cluster have a *system* node pool?"
TAs grade pass/fail in their head — informs which squads need more support.

### HANDOFF
All preflight green. Everyone has a squad assignment. Whiteboard URL is bookmarked.

---

## D1-B1 — M00 Envisioning & Whiteboarding (60 min)

```
GOAL    Each squad produces a draft ADR and a whiteboard sketch for the platform.
SETUP   Open shared whiteboard. Pre-create 1 "frame" per squad with empty stickies for
        Day-0 decisions: cluster SKU, API access, pod IP, mesh, OS, zones, regions,
        identity, secrets, registry.
DOC     modules/00-envisioning/README.md
```

### RUN
- **T0 (8 min)** — Read the **customer brief** out loud (the Contoso Storefront paragraph from [modules/00-envisioning/README.md](modules/00-envisioning/README.md)). Surface the implicit asks: SLO, PCI-adjacent, A/B, multi-region.
- **T+8 (7 min)** — Lead sketches a "platform vs. application" boundary on the whiteboard. Explain that Terraform owns the left, GitOps owns the right. **This is the most important framing of the workshop** — labor it.
- **T+15 (25 min)** — **Breakouts**. Each squad fills in their frame on the whiteboard and starts drafting `adr-001-aks-platform.md` from the template. TAs join each room briefly to check the framing is right (not the content yet).
- **T+40 (15 min)** — Reconvene. Two squads share their whiteboard frame, 4 min each + 1 min critique. Lead annotates with **trade-offs** (e.g., "you picked CNI Overlay — when would CNI VNet be the right answer?").

### CHECK (5 min, in main room, all hands)
1. "Name a Day-0 decision and one alternative you rejected." — round-robin, 2 squads, 1 each.
2. "What's your SLO and what's the matching error budget for 30 days?" — chat, 30 s, scribe collects.

### Q&A (5 min)
Lead asks: "What's nagging you about this design?" Parking-lot anything you can't answer in 1 min.

### HANDOFF
Each squad has an ADR draft committed (or pushed by end of day). Whiteboard frames stay open for the rest of the workshop — we'll mark them up after each module.

---

## D1-B2 — M01 part 1: Bootstrap + apply (80 min)

```
GOAL    `terraform apply` is RUNNING in every squad by the end of the block.
SETUP   Lead pre-runs the bootstrap (remote state) the day before. Share screen on
        a clean clone. Have the OIDC commands and tfvars.example open in another tab.
DOC     modules/01-platform-foundation/README.md
```

### RUN
- **T0 (3 min)** — Frame the goal: "We are not going to *watch* Terraform run. We're going to *start* it, then use the 25-minute window to do M02 reading."
- **T+3 (12 min)** — **Lead demo**: walk through Steps 1–3 live in your demo squad. Narrate every choice: "I'm using `-backend-config=` for the key so each squad's state is isolated." Highlight the OIDC subject string.
- **T+15 (35 min)** — **Breakouts.** Squads:
  1. Receive their OIDC SP creds from the facilitator (pre-staged, dropped via DM)
  2. Set up GitHub repo secrets
  3. `terraform init` + `terraform plan` + `terraform apply` (don't wait for completion)
  4. Read [modules/02-cluster-hardening/README.md](modules/02-cluster-hardening/README.md) while apply is running
- **T+50 (10 min)** — Main room. **Lead does a "live debug" of a deliberately bad squad** (e.g., wrong subscription_id). This normalizes errors and demonstrates the troubleshooting motion. Use one of these prepared bad-states:
  - `Microsoft.Cdn` not registered → `az provider register -n Microsoft.Cdn`
  - subnet CIDR collision → fix in spoke module
- **T+60 (10 min)** — **Architecture deep-dive while apply continues**. Open the live whiteboard, annotate where Front Door, Istio gateway, and Workload Identity will land. Tie each to the ADR.
- **T+70 (10 min)** — Quick poll in chat: "Where is your `terraform apply` right now? `creating front door`? `creating aks`? `done`?" Identify squads that need TA attention at lunch.

### CHECK (in chat, 2 min)
> "Why is `local_account_disabled = true` set on the cluster? What's the cost?"
Acceptable answer: "No out-of-band kubeconfig route → Entra-only access. Cost: requires a working Entra admin path (break-glass)."

### Q&A (3 min)
Cap firmly at lunch boundary. Parking-lot the rest.

### HANDOFF
`terraform apply` is running in every squad. If a squad's apply has failed, the TA owns it through lunch.

---

## Lunch (60 min)
TAs use the first 15 min to chase down stuck squads. The hour also lets long `terraform apply` jobs finish.

---

## D1-B3 — M01 validation + M02 hardening (60 min)

```
GOAL    Clusters are reachable, baseline RBAC + Workload Identity wired,
        mesh injection verified.
SETUP   Have the validation commands queued in your terminal.
DOC     modules/01-platform-foundation/README.md (Step 4)
        modules/02-cluster-hardening/README.md
```

### RUN
- **T0 (5 min)** — Welcome back. Quick poll: "Apply done? Show with reaction." Anyone red gets a TA in their breakout.
- **T+5 (10 min)** — **Lead demo**: validate Module 01. Run `az aks command invoke ... 'kubectl get nodes -o wide'`. Show the 3 zones, the Azure Linux + ephemeral disks, the private API IP. **This is the dopamine moment** — call it out: "You now own a real enterprise cluster."
- **T+15 (10 min)** — Squads run the same validation in their breakouts.
- **T+25 (8 min)** — **Lead demo**: Workload Identity setup (UAMI + federated credential). Pause on the **subject string** — explain why it must match `system:serviceaccount:app:api-node` exactly.
- **T+33 (20 min)** — **Breakouts**. Squads run all of [Module 02](modules/02-cluster-hardening/README.md): UAMI, federated cred, KV role assignment, addon enable, mesh verification.
- **T+53 (5 min)** — Reconvene. One squad demoes `kubectl get pods -n aks-istio-system` showing istiod and the ingress gateway. Lead points at the gateway's external IP and says: "That's tomorrow's A/B testing entry point."

### CHECK (2 min, chat)
> "What's the difference between a Pod Identity (deprecated) and Workload Identity?"
Pass = "Workload Identity uses Kubernetes ServiceAccount tokens federated to Entra; no NMI sidecar, no per-node identity binding."

### HANDOFF
Every squad can `kubectl get nodes`. Istio is alive. UAMI for `api-node` exists with KV access.

---

## D1-B4 — M03 part 1: Build, push, GitOps (90 min)

```
GOAL    Argo CD is bootstrapped, ring-dev and ring-canary are reconciling.
SETUP   Pre-build the three images and tag them as `:v1` on your demo ACR so
        you can demo the first deploy without waiting for builds.
DOC     modules/03-mvp-go-live/README.md (Steps 1–3)
```

### RUN
- **T0 (3 min)** — Frame: "Terraform built the platform. Now we onboard the application — and we do it the way an enterprise does, via GitOps."
- **T+3 (15 min)** — **Lead demo** Step 1 (build & push to ACR). Show the multi-stage Dockerfile briefly, run the `docker build` and `docker push`, then **diff the running build against a participant squad's local clone** so they see what they're about to do.
- **T+18 (25 min)** — **Breakouts** — squads build & push all three images. TAs heavy presence: this is the longest single step and Dockerfiles can fail in many fun ways.
- **T+43 (5 min)** — Energizer: lead screenshares a Grafana dashboard with **no data yet**, sets the expectation: "By T+85 this dashboard will be lit up."
- **T+48 (12 min)** — **Lead demo** Argo CD bootstrap (Step 2 + 3). Walk through `gitops/apps/root.yaml` — emphasize "this one Application creates the per-ring Applications below." Show the UI port-forward.
- **T+60 (20 min)** — **Breakouts** — squads bootstrap Argo CD and apply the root app. Watch `kubectl -n argocd get applications -w`.
- **T+80 (10 min)** — Reconvene. Anyone whose `ring-dev` is `OutOfSync` raises a virtual hand — likely cause is the `REPLACE` placeholder in `kustomization.yaml`. Lead fixes this **live in their squad** on screen so everyone sees the resolution path.

### CHECK (2 min, chat)
> "Why is `ring-prod` permanently `OutOfSync` in Argo CD right now? Is that a bug?"
Pass = "Not a bug — `syncPolicy.automated` is omitted on purpose; prod requires manual sync."

### Q&A (5 min)

### HANDOFF
Two rings (dev, canary) Healthy + Synced. Prod ring exists, OutOfSync, by design.

---

## D1-B5 — M03 part 2: Live customer (65 min)

```
GOAL    A real HTTP request from someone's laptop reaches a v1 Pod via Front Door.
SETUP   Pre-warm the Front Door endpoint (probes can take 5 min the first time).
        Open hey/k6 in a terminal ready to load-test.
DOC     modules/03-mvp-go-live/README.md (Steps 4–5)
```

### RUN
- **T0 (5 min)** — Lead demo: hit the Istio gateway IP directly with `curl /api/products`. Show the JSON with `"version":"v1"`.
- **T+5 (15 min)** — **Breakouts**. Squads do the same. Then `curl` their Front Door endpoint. Open the web UI in a browser and see the storefront render.
- **T+20 (5 min)** — Main room. **Round-robin "first customer impression"**: each squad posts in chat the URL of their storefront and one observation.
- **T+25 (10 min)** — **Lead demo** load test: `hey -z 30s -c 20 $FD/api/products`. Live-watch Grafana fill with timeseries. Annotate: "Where's the CPU pressure? Where's the latency? Where would you want an HPA?"
- **T+35 (20 min)** — **Breakouts**. Squads run the load test, take a Grafana screenshot, save to their squad folder.
- **T+55 (5 min)** — Reconvene. Quick demo of `kubectl describe pod` showing the **Istio sidecar**: "Every pod has two containers. The mesh is sitting next to your app, intercepting traffic."

### CHECK (3 min, chat)
> "List every TLS termination point between a customer browser and a `web-react` pod."
Pass = (1) Front Door edge, (2) Istio ingress gateway (if HTTPS configured), (3) optional sidecar↔sidecar mTLS within the mesh.

### Q&A (2 min)

### HANDOFF
**Success criterion #1 met.** Each squad has a live URL serving real responses. Screenshot logged.

---

## D1-B6 — Day-1 knowledge check + retro (15 min)

```
GOAL    Verify Day-1 outcomes; surface anything for the overnight read.
```

### RUN
- **T0 (8 min)** — **Mini knowledge check** in chat. Three questions, one line each:
  1. *Day-0 decision you'd change if SLO became 99.99%?*
  2. *Where does the `version` label that Istio routes on actually live?*
  3. *Your `terraform apply` failed at `azurerm_cdn_frontdoor_origin.primary` — top suspect?*
  Scribe collects answers; TAs spot gaps for tomorrow.
- **T+8 (5 min)** — **Retro round** — each squad drops in chat: one **+** and one **Δ** for the day.
- **T+13 (2 min)** — Preview Day 2. Homework: skim [Module 04](modules/04-ab-testing/README.md) and [Module 06](modules/06-intrinsic-outage/README.md) tonight.

### HANDOFF
Clusters stay running overnight (cost-acceptable in sandbox). Stop the user node pool to 1 replica if cost-sensitive.

---

# Day 2

## D2-B0 — Re-entry (15 min)

```
GOAL    Surface overnight breakage, reset focus.
```

### RUN
- **T0 (5 min)** — Welcome back. Lead shows their cluster: `kubectl get nodes` + Front Door curl. "Still alive after 16 hours."
- **T+5 (5 min)** — Squads do the same in breakouts. Anyone red: TA on it; lead continues.
- **T+10 (5 min)** — Recap Day 1 in **one minute**: success #1 done, today targets #2–6. Show today's schedule on screen.

### HANDOFF
All squads green or under TA care.

---

## D2-B1 — M04 A/B testing (75 min)

```
GOAL    Each squad has v1 and v2 of api-node running, with both weighted and
        header-based routing demonstrated and observed in Grafana.
SETUP   Pre-build `api-node:v2`. Open a Grafana dashboard split by `version` label.
DOC     modules/04-ab-testing/README.md
```

### RUN
- **T0 (5 min)** — Frame the success: "We're going to put two versions in production and decide whether v2 is worth shipping based on **data**, not vibes."
- **T+5 (10 min)** — **Lead demo** Step 1+2: build & push `v2`, deploy v2 Deployment with `version: v2` label. Verify both pods present. Tie back to the `DestinationRule` subsets we already have.
- **T+15 (15 min)** — **Breakouts**. Squads build, push, and deploy v2.
- **T+30 (5 min)** — Main: **Lead demo** weighted split. Patch the VirtualService 90/10. Loop curl in chat: `for i in {1..50}; do curl -s .../api/products | jq -r .version; done | sort | uniq -c`. Show the distribution.
- **T+35 (15 min)** — **Breakouts**. Squads do weighted split, then header-based (`x-cohort: beta`). Capture screenshots.
- **T+50 (15 min)** — Main: open Grafana, split by `version`. Run a load test. **Have participants predict** which version's latency P95 will be higher before revealing.
- **T+65 (5 min)** — Discussion: **kill-switch drill**. "Your monitoring just paged you that v2 has a memory leak. How fast can you pull it?" Demo: revert the VS, confirm 100 % v1 in 30 seconds.

### CHECK (3 min, chat)
> "You want all customers with `Authorization` header containing `tier=premium` to use v2. Sketch the match block."

### Q&A (2 min)

### HANDOFF
**Success criterion #2 met.** VirtualService back to 100% v1 before B2.

---

## D2-B2 — M05 Deployment rings (80 min)

```
GOAL    A code change ships dev → canary (auto), then waits for a PR + manual
        Argo sync to reach prod.
SETUP   Have the CI workflow visible. Pre-create the GitHub Environments and
        protection rules on the demo repo so participants can see them.
DOC     modules/05-deployment-rings/README.md
```

### RUN
- **T0 (8 min)** — Whiteboard: draw the promotion flow (the ASCII diagram from M05's README). Make every transition explicit. Ask: "Where can a human stop this train?"
- **T+8 (10 min)** — **Lead demo** the CI workflow. Walk through `.github/workflows/ci.yaml` for 4 minutes. Show GH Environments protection rules for 4 minutes. Show the Argo CD RBAC ConfigMap for 2 minutes.
- **T+18 (8 min)** — **Energizer** — predict the path of a hypothetical PR: who approves what, what auto-bumps, what waits. Crowdsource on whiteboard.
- **T+26 (25 min)** — **Breakouts**. Squads practice **a release**:
  1. Open a small PR (change a string)
  2. Merge → watch CI build & push :sha
  3. Watch canary auto-bump and Argo sync
  4. Smoke test passes → prod-bump PR opened automatically
  5. Approve PR + manual Argo sync to prod
- **T+51 (15 min)** — **Breakouts**. Squads practice **a rollback** — both paths (Argo UI rollback and Git revert PR). Note times.
- **T+66 (10 min)** — Reconvene. Two squads compare rollback times. **Discussion**: Argo UI is fast but leaves Git out-of-sync — is that ever acceptable? Lead: "In a real incident, yes. The reconciliation step is committed *after* customers are safe."
- **T+76 (4 min)** — Wrap.

### CHECK (3 min, chat)
> "Your Argo CD rolled prod back to v1, but Git still says v2. What's the next action and why?"
Pass = "Open and merge a revert PR — Git is the source of truth; the rollback is currently drift."

### HANDOFF
**Success criterion #3 met.** All squads have a working dev → canary → prod gated flow.

---

## Lunch (60 min)
Cost-saving: squads set `node_pool_user_min = 1` for the break. Restart will happen during M06 anyway.

---

## D2-B3 — M06 Intrinsic outage (90 min)

```
GOAL    Each squad runs THREE chaos scenarios and writes an incident summary for ONE.
SETUP   Pre-prepare a "war room" screen layout: live Grafana + curl loop + kubectl
        get pods -w side by side. Open the AKS / Istio dashboard in Grafana.
DOC     modules/06-intrinsic-outage/README.md
```

### RUN
- **T0 (5 min)** — Frame: "Intrinsic = cause is **inside** the cluster. Cluster is up, your service is degrading. Customers see slow + flaky, not down."
- **T+5 (8 min)** — Whiteboard: draw the SLI / SLO / error-budget triangle. Make it concrete with their cluster's 99.9 % availability budget = 43 min/month. **Then announce**: "We're going to spend some of that budget on purpose, today."
- **T+13 (5 min)** — Lead demos the **war-room layout**. Tells participants to set up the same view.

### Round 1 — Scenario 6A (Pod kill) — 20 min
- **T+18 (5 min)** — Lead runs the random-kill loop on their squad's Cluster. Narrates the Grafana view: "Watch the success-rate panel — does it dip?" With PDB at `minAvailable: 2`, it doesn't.
- **T+23 (5 min)** — Lead **breaks the PDB** (sets `minAvailable: 0`), re-runs. SLO breaches. Restores PDB. "**Configuration matters more than the feature.**"
- **T+28 (10 min)** — Breakouts: squads run 6A themselves. Capture Grafana screenshots.

### Round 2 — Scenarios 6C (Node drain) OR 6E (Bad deploy) — 25 min
- **T+38 (5 min)** — Lead picks one and demos. Most cohorts: pick 6E (bad deploy) — it's the most realistic.
- **T+43 (20 min)** — Breakouts. Squads run their chosen scenario, observe, recover. Argo CD UI rollback timed.

### Round 3 — Scenario 6D (Zone failure with Chaos Studio) — 20 min
- **T+63 (5 min)** — Lead demos the Bicep deploy + experiment start. This is the "wow" scenario — entire zone of nodes goes away, workload survives.
- **T+68 (15 min)** — Breakouts. Squads run the experiment, watch zones 1 + 3 absorb load, confirm Front Door stays green.

### Wrap-up — 10 min
- **T+83 (5 min)** — Each squad posts one Grafana screenshot from their favorite scenario in chat.
- **T+88 (2 min)** — Assign homework for the next 24 h: **commit the incident summary** for their chosen scenario.

### CHECK (rolled into homework)
> Write a 5-line post-incident summary for one scenario at `modules/06-intrinsic-outage/incident-<scenario>.md`.

### HANDOFF
**Success criterion #4 met.** Workloads stable; bad deploys reverted. Cluster healthy for B4.

---

## D2-B4 — M07 Extrinsic outage (75 min)

```
GOAL    Live failover from primary to secondary cluster with measured RTO/RPO.
SETUP   Confirm secondary Argo CD bootstrap was done at end of Day 1 (or do it
        as part of "pre-flight" of this block).
DOC     modules/07-extrinsic-outage/README.md
```

### RUN
- **T0 (5 min)** — Whiteboard: intrinsic vs extrinsic side-by-side. "When a Microsoft engineer's pager goes off because of a region issue, *your* customers' experience depends on what you built today."
- **T+5 (15 min)** — **Pre-flight in breakouts**: bootstrap Argo CD on the secondary cluster. (If done overnight, validate; otherwise apply now.)
- **T+20 (10 min)** — Main: **Lead demo** Step 1 (surgical Front Door origin disable). Run `hey` against Front Door, watch traffic shift in 30 s. Capture the **observed RTO**.
- **T+30 (20 min)** — **Breakouts**. Squads do the failover, capture RTO + RPO. Use the "surgical" method first (FD origin disable), then optionally "brutal" (`az aks stop`).
- **T+50 (10 min)** — Main: **Lead demo** recovery. Re-enable origin. Discuss "don't flood primary instantly" — set weight low first, then ramp.
- **T+60 (10 min)** — **Group discussion** (no breakout): what state DIDN'T survive failover? In our stateless demo, none. In real life, what state would? Where would Cosmos DB / SQL geo-replication sit?
- **T+70 (5 min)** — Wrap.

### CHECK (3 min, chat)
> "Your observed RTO was 90 s, but customer P95 latency stayed elevated for 4 min. Why?"
Pass = "Connection keep-alive, DNS TTL, cold-start of secondary pods absorbing 2× load."

### HANDOFF
**Success criterion #5 met.** Front Door back to dual-origin with primary preferred.

---

## D2-B5 — M08 Optimization (35 min — compressed)

```
GOAL    Demonstrate spot + KEDA + right-sizing as live levers.
NOTE    This block is compressed to make room for the final knowledge check.
        Spot pool and KEDA are demo'd by lead; rightsizing is the only breakout.
DOC     modules/08-optimization/README.md
```

### RUN
- **T0 (3 min)** — Frame: "Reliability + cost is the L400 conversation. We've earned it."
- **T+3 (10 min)** — **Lead demo** spot pool turn-on (`terraform apply` with `enable_spot_pool=true` was done at lunch), worker toleration, scheduling on spot.
- **T+13 (10 min)** — **Lead demo** KEDA `ScaledObject`: drive load on the worker, watch it scale 0 → N → 0.
- **T+23 (10 min)** — **Breakouts**: squads right-size `api-node` based on actual Grafana usage data. Edit `requests`, redeploy, confirm.
- **T+33 (2 min)** — Wrap.

### CHECK (rolled into the final assessment)

### HANDOFF
Spot pool can be torn back down for cleanup. KEDA stays.

---

## D2-B6 — Final knowledge check + close (30 min)

```
GOAL    Score each participant; close strong; clean up.
DOC     assessment/knowledge-check.md
```

### RUN
- **T0 (3 min)** — Frame: "60 minutes' worth of questions; you have 25. Pick what shows your best level. The L400 extension is bonus — answer it only if you've finished sections A–E."
- **T+3 (20 min)** — **Silent work**: participants answer in `assessment/submissions/<your-name>/answers.md`, commit, push.
- **T+23 (5 min)** — Close the room:
  - Surface 1 standout answer from chat (with permission)
  - Announce: "Scores back within 24 hours."
  - Share post-workshop resources: WAF AKS service guide, AKS Roadmap, Argo CD docs.
- **T+28 (2 min)** — **Cleanup heads-up**: facilitator runs `terraform destroy` per squad after the recording stops. Reminder: any commits / artifacts in your fork are yours to keep.

### HANDOFF
**Success criterion #6 met** once grades come back. Cohort dismissed.

---

# Cross-cutting playbooks

## Remote-engagement micro-techniques

- **Rotating answerer** — When asking a question to the room, name the **role**, not the person: "Whoever owns the `kubectl` for your squad, what does `get pods -n app-prod` show?" Forces shared ownership.
- **Chat starboard** — Scribe pins 1 great chat answer per block. End-of-day the scribe summarizes the starboard — public recognition matters remotely.
- **5-second silence** — After a question, **wait 5 seconds before calling on anyone**. Lurkers often answer in chat in second 4.
- **"Show your tab"** — Periodically: "Drop a screenshot of your current view in chat." Gives you signal on who's actually keeping up.

## When to slow down

Hard slow-down triggers (don't move on until cleared):
- More than 30 % of squads red on a knowledge check
- Argo CD not reconciling for any squad (next module depends on it)
- Any squad stuck on Terraform for > 30 min
- Confusion about platform-vs-application boundary (M00 framing missing)

## When to skip

Soft skip triggers (announce + cut a stretch goal):
- Behind by > 15 min at any break
- Lead's voice is tired (rare honesty — but it shows on Zoom)
- Cohort is overwhelmingly senior — skip 6A and go straight to 6E

## Knowledge-check cadence

| When | What | Format | Owner |
|---|---|---|---|
| End of D1-B0 | L200 floor (system pool) | Chat | Scribe |
| End of D1-B1 | Day-0 decisions + SLO/EB | Round-robin + chat | Lead |
| End of D1-B2 | `local_account_disabled` | Chat | Lead |
| End of D1-B3 | WI vs Pod Identity | Chat | Lead |
| End of D1-B4 | Why `ring-prod` is OutOfSync | Chat | Lead |
| End of D1-B5 | TLS termination map | Chat | Lead |
| End of D1-B6 | Three-line mini-check | Chat | Scribe |
| End of D2-B1 | Header-match block sketch | Chat | Lead |
| End of D2-B2 | Argo rollback truth-source | Chat | Lead |
| End of D2-B3 | Incident summary (homework) | File | TAs grade |
| End of D2-B4 | RTO vs P95 explanation | Chat | Lead |
| **D2-B6** | **Final assessment** | **Markdown file** | **Lead + TAs grade** |

## Cleanup checklist (lead, after dismissal)

```powershell
# For each squad
foreach ($squad in 1..$cohortSize) {
  Push-Location "infra/terraform/envs/squad-$('{0:00}' -f $squad)"
  terraform destroy -auto-approve
  Pop-Location
}

# Bootstrap (only if NOT reusing the subscription for another cohort)
Push-Location infra/terraform/bootstrap
terraform destroy -auto-approve
Pop-Location

# Entra apps (per squad OIDC SPs)
az ad app list --display-name "sita-squad*-tf" --query "[].appId" -o tsv | ForEach-Object {
  az ad app delete --id $_
}
```

## Post-workshop (within 24 h)

1. Grade the knowledge checks against [assessment/rubric.md](assessment/rubric.md)
2. Send each participant their level + the rationale (3 sentences max)
3. Post the **starboard** (top chat insights) to your community channel
4. Capture facilitator-side gotchas in a `RETRO.md` for the next cohort
