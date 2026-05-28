# Self-Grading Rubric

Total: 100 (A–E) + 30 (F bonus).

Scoring: **2 = strong**, **1 = partial / missing nuance**, **0 = wrong or absent**.

## A. Scenario & SLOs (15)

| # | Look-for | Pts |
|---|---|---|
| A1 | Names the Java socket gateway + C++ parser + Postgres replatform; calls out parts left untouched (wire protocol, airline endpoints, on-prem partners) | 5 |
| A2 | Quantifies the SLO (e.g., 99.95 %) AND the 30-day budget AND argues why HTTP 2xx is wrong (TCP semantics, no request/response framing, persistent connections) | 5 |
| A3 | Names a real leading indicator (e.g., SYN rate without ESTABLISHED follow-through, P95 connection setup time, NLB SNAT port exhaustion) | 5 |

## B. Day-0 architecture (20)

| # | Look-for | Pts |
|---|---|---|
| B1 | Each rejected alternative is concrete and tied to a Skybridge-specific risk (not generic) | 8 |
| B2 | Stable identity for socket affinity, ordered rollout, headless service for mesh; Deployment would re-hash Pod names breaking NLB stickiness | 6 |
| B3 | Out-of-cluster Postgres → state survives cluster rebuild, managed HA/backup; in-cluster risks include data loss on cluster delete, no managed PITR, etcd pressure | 6 |

## C. Identity, security, routing (20)

| # | Look-for | Pts |
|---|---|---|
| C1 | Names: SA token → cluster OIDC issuer → Entra federated-credential exchange → access token → Postgres Entra auth | 7 |
| C2 | Refutes: Front Door is HTTP/L7; would terminate TCP, break socket semantics, drop messages mid-stream | 6 |
| C3 | Header-based VirtualService match on `x-cohort: <airline>` routing to `parser-cpp` subset v2 | 7 |

## D. GitOps, rings, rollback (20)

| # | Look-for | Pts |
|---|---|---|
| D1 | Human-in-the-loop gate; auto-sync would push canary failures into prod without approval | 6 |
| D2 | UI rollback = faster MTTR, Git is left "ahead". Revert PR = auditable, slower, cluster + Git remain in sync. Both have a use. | 8 |
| D3 | Argo will overwrite within the next sync window (default 3 min); the imperative edit is lost; mention `self-heal` reverting drift sooner | 6 |

## E. Outage & failover (25)

| # | Look-for | Pts |
|---|---|---|
| E1 | (1) topology-spread + multi-zone scheduling, (2) PDB, (3) NLB cross-zone + readiness probes draining the zone Pod | 8 |
| E2 | Reconnect ≠ steady-state: parser HPA still scaling, Postgres connection pool warming, Istio outlier detection ejecting cold Pods, Pod cold-start CPU spike | 9 |
| E3 | RPO = messages acknowledged at primary but not yet replicated to secondary at cutover; reduce via synchronous replication (cost: latency), or app-level dual-write, or smaller geo lag SLO + faster failover | 8 |

## F. L400 bonus (30)

| # | Look-for | Pts |
|---|---|---|
| F1 | Cost-vs-RTO trade-off explicit; cold = cheapest, slow; warm = expensive, fast; mentions Postgres restore time as long pole | 10 |
| F2 | Three distinct hypotheses (GC, batch reconciler tick, Postgres checkpoint), each with a discriminating signal | 10 |
| F3 | Sketches a closed loop: AnalysisTemplate / WasmPlugin / external SRE controller reading SLO metric, with a clear "abort" condition and a kill-switch | 10 |

---

## How to use

Score yourself honestly. Total ≥ 80/100 on A–E = competent to take the platform back to your team. ≥ 90 + ≥ 20/30 on F = you should be the one running the customer's CAB.
