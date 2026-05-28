# Module 00 — Envisioning & Architecture Decisions

**Time:** ~45 min (trainer-facilitated)  |  **Level target:** L300 baseline · L400 stretch

## 1. Outcomes

By the end you can:

- Restate the Skybridge legacy → target transition in 2 sentences without notes
- Defend the **9 Day-0 AKS decisions** against a credible alternative for each
- Write SLIs/SLOs that reflect a **socket-based**, real-time messaging workload (not an HTTP API)
- Commit an Architecture Decision Record (ADR) that the platform & app teams will both sign off on

## 2. Where this fits in the replatform story

This is where the cohort agrees on the **shape of the target architecture** before anyone runs `terraform apply`. Every later module references decisions made here. Get the Day-0 decisions wrong and Module 03–07 will fight you.

Read [SCENARIO.md](../../SCENARIO.md) before starting if you haven't.

## 3. Level target

- **L300:** Make the decision, write down the alternative considered, link to one piece of evidence.
- **L400:** Quantify the trade-off (cost, blast radius, lead time to change later) and tie it to a Skybridge-specific risk.

## 4. Talk track *(trainer, ~10 min)*

Frame the room: this customer is *not* greenfield. They have:
- a real wire protocol (Type B / SITATEX) with real airline endpoints that **cannot be told to reconnect during business hours**;
- a 24×7 NOC that watches dashboards built around socket counts and message latency, not RPS;
- a regulator-imposed RTO of 30 min and RPO of < 1 min for the message journal.

The temptation is to copy a generic "AKS for a web API" reference architecture. Resist. The two decisions that change everything for *this* customer are:
1. **Stateful gateway tier** — `gateway-java` is a StatefulSet, not a Deployment, and it sits behind an Azure **Standard Load Balancer for TCP** (not Front Door, not Application Gateway). Sockets are sacred.
2. **State stays out of the cluster** — PostgreSQL is **Azure Database for PostgreSQL — Flexible Server** with zone-redundant HA, not a Helm-chart Postgres in the cluster. The message journal cannot lose minutes.

Walk the room through those two and the rest of the Day-0 table falls into place.

## 5. Demo cues *(trainer)*

- Show the [target architecture diagram](../../README.md#target-architecture-end-state) on the projector while you talk through the talk track.
- Open the customer's legacy diagram in [SCENARIO.md](../../SCENARIO.md#current-state-legacy-stack) side by side — point at each box and say what replaces it.
- Open [`adr-template.md`](adr-template.md) and fill in the **header + one decision row** live so participants see the shape they're aiming for.

## 6. Participant steps

### 6.1 Read the brief (5 min)
Skim [SCENARIO.md](../../SCENARIO.md) and the customer's stated SLOs.

### 6.2 Walk the 9 Day-0 decisions (20 min)
The trainer drives the discussion; you capture each decision and at least one *rejected* alternative.

| # | Decision | Workshop default | Skybridge-specific rationale |
|---|---|---|---|
| 1 | **Cluster SKU** | AKS Standard | Need spot, mesh revision pinning, private API, NAP — Automatic doesn't expose enough levers yet. |
| 2 | **API server access** | Private cluster | Audit + regulator expectation; sockets traverse a separate NLB anyway. |
| 3 | **Pod network** | Azure CNI Overlay (Cilium dataplane) | Avoids VNet IP exhaustion as parser auto-scales. |
| 4 | **Service mesh** | Istio managed addon (revision pinned) | Header-based A/B for parser cohorts; mTLS Pod-to-Pod by default. |
| 5 | **Node OS** | Azure Linux | Faster boot improves zone-failover RTO for reconnecting sockets. |
| 6 | **Zones** | 1+2+3 across all pools | 99.95 % SLA + protects against single-AZ loss. |
| 7 | **Region pair** | eastus2 (primary) + westus3 (passive) | Postgres Flex geo-replica supported; latency to airline hubs acceptable. |
| 8 | **Identity** | Workload Identity + Entra | Postgres can authenticate via Entra → no long-lived DB passwords. |
| 9 | **Secrets** | Key Vault CSI | Single source of truth; rotates without Pod restart for many secret types. |

### 6.3 Define the SLIs/SLOs (10 min)
Note these are **not** HTTP SLIs. The legacy NOC will not accept "% of 200 responses".

| SLI | Definition | SLO | 30-day budget |
|---|---|---|---|
| **Socket establishment success** | % of TCP `SYN` from known airline source IPs that reach `ESTABLISHED` in < 2 s | 99.95 % | 21m 36s |
| **Message round-trip latency P99** | `gateway-java` receives envelope → ACK back to client | ≤ 250 ms | n/a |
| **Parser decode success** | `parser_decoded_total / (decoded + failed)` | 99.99 % | n/a |
| **Journal write durability** | Postgres acknowledged write within 1 s | 99.99 % | 4m 18s |
| **Reconnect storm absorption** | After a zone drain, ≥ 99 % of displaced sockets reconnect within 30 s | 99 % | n/a |

### 6.4 Write the ADR (10 min)
Copy [`adr-template.md`](adr-template.md) → `modules/00-envisioning/adr-001-aks-platform.md`. Fill in **at least 3** of the 9 Day-0 decisions in full, including the rejected alternative.

## 7. Validation

- `modules/00-envisioning/adr-001-aks-platform.md` exists with decisions, rationale, and rejected alternatives.
- You can answer aloud: *what's our latency SLO and what's the 30-day error budget?*
- You can answer aloud: *what protects us from a regional Azure outage? what protects us from a bad code release?* — different answers, different modules.

## 8. Stretch (L400)

- Defend Azure CNI Overlay vs Azure CNI VNet-routable in writing for **this** workload.
- Draw a blast-radius diagram: if the gateway's Workload Identity federated credential leaks, what can the attacker do?
- Score this architecture against the [AKS WAF service guide](https://learn.microsoft.com/azure/well-architected/service-guides/azure-kubernetes-service) Reliability and Security pillars 1–5 with one-sentence justifications.
- Add a 10th Day-0 row: *Postgres connection pooling strategy* — pgBouncer sidecar vs in-Pod HikariCP vs Azure Database for PostgreSQL built-in pooler. Pick one, defend it.

## 9. Cleanup

None. Keep the ADR — every later module references it.
