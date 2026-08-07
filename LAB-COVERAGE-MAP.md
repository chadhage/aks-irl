# Hands-on lab coverage map

This map connects each workshop reading and major concept to an observable participant lab. Use [LAB-GUIDE-ACTIVITIES.md](LAB-GUIDE-ACTIVITIES.md) as the canonical step-by-step path.

Every activity follows the mandatory confirmation protocol: perform one numbered action, compare the result with **Confirm**, record evidence, mark `[ ] CONFIRMED`, and only then continue. **CHANGE GATE** and **RECOVERY GATE** steps require partner or trainer confirmation.

## Foundation readings

| Reading or concept | Hands-on lab | Evidence produced |
|---|---|---|
| [prerequisites.md](prerequisites.md): tools, versions, authentication, subscription context | Activity 0.1 | Green preflight output and verified Azure context |
| [SCENARIO.md](SCENARIO.md): legacy system, target architecture, state, protocols, failure domains | Activities 0.2–0.3 | Legacy/target request-path drawing with pod, node, zone, and region failures marked |
| [README.md](README.md): terminology and target architecture | Activity 0.3 | Correct TCP and HTTP paths, trust boundaries, and persistence boundary |
| [modules/appendix-a-intro-to-aks/README.md](modules/appendix-a-intro-to-aks/README.md): containers, Kubernetes, AKS | Appendix activities 1.3, 2.4, and 3.4 | Built image, local Kubernetes workload, and AKS deployment evidence |

## Module readings and concepts

| Module | Reading, scenario, or concept | Hands-on lab(s) | Required confirmation |
|---|---|---|---|
| M00 | Nine Day-0 decisions and reversibility | M00.1 | Nine individual choices, rejected alternatives, and one verbal defense |
| M00 | SLI, SLO, SLA, and error budget | M00.2 | Latency target, availability target, and calculated 30-day budget |
| M00 | Architecture Decision Records | M00.3 | ADR with rationale and rejected alternative for every decision |
| M01 | Remote Terraform state | M01.1 | Storage-backed state and lock-ready backend |
| M01 | GitHub OIDC federation | M01.2 | Federated credential and secretless CI configuration |
| M01 | Plan review and pinned configuration | M01.3 | Exit-zero plan with no unintended destroys |
| M01 | Hub-spoke, AKS, ACR, Key Vault, PostgreSQL, Front Door, and observability provisioning | M01.4 | Successful apply and non-empty outputs |
| M01 | Platform versus application ownership | M01.5 | Terraform-owned and GitOps-owned object lists with no ambiguous owner |
| M02 | Private AKS API access and zones | M02.1 | Three ready zonal nodes reached through an approved path |
| M02 | Workload Identity trust chain | M02.2–M02.3 | Correct federated subject, UAMI token, and passwordless Postgres query |
| M02 | Istio add-on health | M02.3 | Ready control-plane pods |
| M02 | Key Vault Secrets Store CSI | M02.4 | Healthy mount and provider events without exposing secret values |
| M03 | Container builds, tags, digests, and ACR pull | M03.1–M03.2 | Three versioned images present in ACR |
| M03 | Argo CD bootstrap and App-of-Apps | M03.3 | Healthy controller and root application |
| M03 | Kustomize environment values | M03.4 | No placeholders and three renderable overlays |
| M03 | GitOps reconciliation and manual production boundary | M03.5 | Dev/canary synced; production intentionally unsynced |
| M03 | Long-lived TCP behavior and Azure Load Balancer | M03.6 | Socket success, zero drops, and measured P99 |
| M03 | Front Door console path and end-to-end message trace | M03.7 | Live console metrics and a complete message trace |
| M03 | Gateway/parser separation | M03.8 | Parser failure evidence while gateway sockets remain established |
| M03 | Readiness, PDB, lifecycle, and termination grace | M03.9 | Drain transition, bounded reconnect, and recovered baseline |
| M04 | Immutable parser v2 build and parallel deployment | M04.1–M04.2 | Both versions available and healthy |
| M04 | Weighted traffic routing | M04.3 | Observed distribution with sample count |
| M04 | Header-based cohorts | M04.4 | Deterministic beta/default routing evidence |
| M04 | Version metrics and kill switch | M04.5 | Grafana split and timed return to 100% v1 |
| M05 | Trunk-based small PR and CI supply chain | M05.1–M05.2 | Narrow PR, scan result, and immutable SHA image |
| M05 | Automated canary reconciliation | M05.3 | Canary on the new SHA and healthy |
| M05 | Soak test and promotion evidence | M05.4 | Successful workflow plus latency, errors, and socket success values |
| M05 | Human production gate | M05.5 | Approved merge, manual Argo sync, and expected production image |
| M05 | Fast rollback versus durable Git revert | M05.6 | Two rollback timings and reconciled desired state |
| M06 | War-room observability | M06.1 | Three live panes and a 60-second baseline |
| M06 | Pod disruption, PDB, and mesh retries | M06.2–M06.3 | Bounded pod kills, observed failure, restored PDB, and recovered SLO |
| M06 | Bad rollout and kill switch | M06.4 | Threshold-triggered rollback under target and Git recovery |
| M06 | Zone outage and reconnect storm | M06.5 | 99% reconnect time, restored zone spread, and stable SLO |
| M06 | Incident learning | M06.6 | Three screenshots and one evidence-based write-up |
| M07 | Warm secondary and independent GitOps controller | M07.1 | Healthy idle secondary ring |
| M07 | Asynchronous replication and RPO | M07.2 | Timestamped lag below threshold |
| M07 | Socket failover baseline | M07.3 | Sustained connection count, drops, and RTT |
| M07 | Database promotion and DNS cutover | M07.4 | Four preconditions, one writable server, DNS evidence, and reconnect time |
| M07 | RTO and RPO calculation | M07.5 | Two values with units and method |
| M07 | Controlled failback | M07.6 | Correct replication direction, pre-scaled primary, one writer, and stable traffic |
| M08 | Spot suitability and scheduling | M08.1 | Plan review, ready spot node, and batch-only placement |
| M08 | Event-driven autoscaling and cold start | M08.2 | Healthy KEDA controller/query and observed `0 → N → 0` behavior |
| M08 | Evidence-based right-sizing and socket-safe rollout | M08.3 | P95 calculation, lifecycle proof, narrow diff, and stable sockets |
| Final | Knowledge synthesis and calibrated self-assessment | Final.1–Final.2 | Committed answers, rubric score, and justified learning gaps |

## Scenario and safety gates

| Scenario | Gate before change | Recovery evidence before completion |
|---|---|---|
| Parser unavailable in dev | Baseline sockets and message success recorded | Argo restores parser; message success returns |
| PDB removed | Healthy traffic and PDB present in Git | PDB values restored; replicas ready; SLO stable for 60 seconds |
| Bad production parser | Isolated lab ring and known-good revision confirmed | Good image running; normal Git revert pushed; Argo and Git agree |
| Zone failure | Surviving zones and capacity verified | Experiment ended; zone spread restored; SLO stable |
| Regional failover | Secondary health, gateway readiness, replica lag, and traffic baseline verified | One database writer; secondary serves stable traffic; RTO/RPO recorded |
| Regional failback | Secondary stable and rollback point available | Correct replication posture, primary zone spread, and stable traffic |
| Spot pool apply | Terraform plan contains no cluster or gateway replacement | Batch pods on spot; serving parser stays on regular nodes |
| Gateway right-size rollout | Drain contract and sustained socket baseline verified | All replicas updated and SLO stable for 60 seconds |

## Maintaining coverage

When adding or substantially changing a reading:

1. Add or update one activity that makes the concept observable.
2. Give every numbered action an immediate **Confirm** statement.
3. Require recorded evidence rather than “observe” or “verify” without a threshold.
4. Add **CHANGE GATE** before shared-state or disruptive actions.
5. Add **RECOVERY GATE** and a specific restored-state check.
6. Update this map in the same pull request.
