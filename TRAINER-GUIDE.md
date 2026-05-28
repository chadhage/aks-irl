# Trainer Guide — Facilitator Runbook

> Read end-to-end before the first delivery. Assumes you are a Microsoft SME (CSA, FTE, GBB, Specialist) who has delivered at least one WorkshopPlus. If not, shadow first.

---

## The frame to keep in your head

You are teaching **how to land a socket-based real-time messaging workload on AKS properly** — not how to write a Java gateway or a C++ parser. The apps under [`apps/`](apps/) are **mocks** built to give participants something realistic to exercise the architecture against:

- `gateway-java` — Netty server speaking a 3-verb toy protocol on TCP 4561/4562.
- `parser-cpp` — `libmicrohttpd` decoder; `v1` vs `v2` differ only enough to A/B.
- `ops-console` — static nginx dashboard.

Whenever a participant gets pulled into the application code, pull them back to the **architecture and operational moves**. "If your customer's real code drops in here, this same Pod template, PDB, NLB annotation, and routing rule still apply." That's the workshop's value.

---

## Before the engagement

### T-10 business days

- Cap cohort at 12 (more → add a TA).
- Each participant has Owner on a sandbox subscription meeting the quotas in [prerequisites.md](prerequisites.md).
- Lock the format with the sponsor: 3-day intensive, 5-day distributed, or briefing + self-paced.

### T-5 business days

Send participants the repo link, [prerequisites.md](prerequisites.md) (call out the **quota check** and **feature-flag registrations** — those can take hours), and [SCENARIO.md](SCENARIO.md).

Spin up your own clean lab end-to-end and **leave it deployed** as the live reference.

### T-1 business day

- Dry-run `./scripts/preflight.sh` on a fresh laptop.
- Pre-arrange screen layout for the war-room demos (M06/M07): Grafana + Portal + Argo UI + `kubectl get pods -w` + socket generator.
- Backup laptop ready. The demo machine *will* misbehave at the wrong moment.
- Pre-build the three images and push to a **fallback ACR** you control — at least one participant's local Docker will fail on the gcc-based parser image.

---

## Delivery formats

### A — 3-day intensive

| Day | AM (4 hr) | PM (4 hr) |
|---|---|---|
| **1** | Kick-off + SCENARIO + **M00** | **M01** (kick off apply, M02 concept tour during wait) |
| **2** | **M02** finish + **M03** MVP | **M04** A/B + **M05** rings |
| **3** | **M06** war room | **M07** + **M08** + assessment |

### B — 5-day distributed

| Day | Block (4 hr) |
|---|---|
| 1 | M00 + M01 |
| 2 | M02 + M03 |
| 3 | M04 + M05 |
| 4 | M06 |
| 5 | M07 + M08 + assessment |

Adds 1 hr/day for "what did we leave running overnight" checks.

### C — Briefing + self-paced

| Block | Content |
|---|---|
| AM (4 hr) | Trainer-led SCENARIO + M00 + M01 walkthrough (no hands-on yet) |
| Lunch | Participants kick off their own `terraform apply` |
| PM (3 hr) | Live demo of M03 + M06 + M07 |
| Post | Participants run M02–M08 self-paced over 2 weeks, weekly office hours |

---

## Module facilitation notes

### M00 — Envisioning
- Project the legacy diagram in [SCENARIO.md](SCENARIO.md) before revealing the target. The contrast lands the architecture.
- Day-0 decisions as a group exercise: vote, then reveal the recommended default. The argument is the learning.
- Cut path if short on time: assign the ADR as evening homework, review 3 at random next morning.

### M01 — Platform foundation
- Apply runs ~25 min. Use the wait for the **M02 concept tour** (Workload Identity, Istio, KV CSI). Do **not** let people start M02 commands until M01 is green.
- Stalls: OIDC subject mismatch, missing provider/feature registration, vCPU quota in secondary region.

### M02 — Hardening
- Demo `az aks command invoke` first so nobody tries to set up Bastion + jumpbox the hard way.
- Whiteboard the **SA token → cluster OIDC → federated credential → Entra token → Postgres** chain. Most-asked concept of the day.

### M03 — MVP go-live
- Have your fallback ACR ready — laptops fail on the parser build.
- The first inbound TCP socket reaching the gateway through the NLB is the **hero moment**. Make a thing of it.
- Drive synthetic load with [`scripts/smoke.sh`](scripts/smoke.sh) while Grafana is on the projector.

### M04 — A/B testing
- Frame as: *"can you ship a parser rule change without a maintenance window?"* — not "let's split traffic 90/10 because Istio is cool".
- Header-based routing is the L400 trick. Have each participant route their own `x-cohort: <name>` to v2.

### M05 — Rings
- GH Actions takes a minute to wake up. **Pre-create one PR** in your demo repo so you have something to show while the cohort's runs queue.
- The **rollback drill** is the real point. Time both paths on the shared screen.

### M06 — Intrinsic outage (most intense module)
- War-room setup: trainer screen splits Grafana / `kubectl -w` / load output / Argo UI. TA roams.
- Pace yourself. Each scenario is ~20 min done well. Don't try all four in 90 min.
- The most-missed lesson: **draining a Node drops every TCP socket on the gateway Pods on that Node.** This is the difference between a stateless web API and this workload. Drive it home.

### M07 — Extrinsic outage
- The **DNS TTL / connection keepalive** discussion is the heart. Cluster failover is easy; convincing client sockets to reconnect to the other region is the hard problem.
- Pre-stage Argo on the secondary cluster if the group is running long — saves ~20 min.

### M08 — Optimization
- Spot pool is a quick demo. KEDA against the parser is the L400 talking point.
- Right-size with **actual** numbers from the running cluster — open Grafana to the real P95 since M03.

### Assessment
- Do A1, B2, C3, D3 **out loud as a group** — they are the level-determining ones. Rest async, self-graded.

---

## Cohort dynamics

### One participant stuck > 10 min
Pair with the TA in a breakout. Keep the room moving.

### Whole room stuck
Usually means a setup step got skipped — most often:
- forgot to commit + push after editing a GitOps overlay
- skipped `az login` re-check after a long break
- region had transient capacity issue (rare, real — may need new region pair)

Stop, regroup at the projector, redo the step **slowly**, release back to hands-on.

### Someone finishes early
Stretch (L400) of the current module. There is more than any one participant can finish — intentional.

---

## Recovery — when things go wrong

| Broke | First-resort | Trainer demo |
|---|---|---|
| `terraform apply` fails on Front Door | `terraform refresh && terraform apply` | Show working diff on your cluster |
| Image build OOM on small laptop | Pull from your fallback ACR | Project your own build |
| `ring-dev` stuck OutOfSync | `grep -rn REPLACE k8s gitops` | Demo the grep |
| Private API unreachable | `az aks command invoke` always works | `alias kx="az aks command invoke -g $RG -n $AKS --command"` |
| Cohort lost an evening | Cut M04 deep-dive, demo A/B routing yourself | Pre-record a screen capture as last-resort |

---

## After the engagement

- Aggregate (anonymized) self-scores into a one-page sponsor readout: *"6 of 8 reached L300; 2 reached L400."*
- File engagement notes in your delivery log — next SME benefits.
- Encourage participants to **keep their fork** as their reference architecture for the year.
- If the customer wants Phase 2, the **L400 stretch items** across modules are the natural backlog.
