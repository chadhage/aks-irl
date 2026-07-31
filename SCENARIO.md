# Scenario — Replatform a Real-Time Airline Messaging System onto AKS

> This is the *fictional but realistic* customer brief that frames every module of the workshop. Trainer reads it aloud at the kick-off. Participants reference it for the ADR (Module 00) and for the final knowledge check.

---

## The customer

**Skybridge Messaging Services** is a tier-1 airline messaging operator. They move ~2.4 billion messages a month between airlines, ground handlers, GDSs, baggage systems, and flight-operations platforms. Their flagship product is a real-time **Type B / EDIFACT-style** messaging bus over **persistent TCP sockets**, with strict end-to-end SLAs.

| Dimension | Today |
|---|---|
| Message volume (peak) | 95k messages/sec, ~2.4B / month |
| Concurrent client sockets | 180k across the estate |
| End-to-end delivery SLA (P99) | < 250 ms intra-region, < 600 ms inter-region |
| Availability SLA | 99.95 % monthly per region, 99.99 % global |
| Compliance | PCI-adjacent (payment-card-routing messages), aviation regs (IATA RP 1745, EUROCONTROL) |
| Audit retention | 90 days hot, 7 years cold |

## The legacy estate

```
         Airline endpoints (DCS, baggage, ops, GDS)
                       │
                       ▼  long-lived TCP (port 4561 / 4562 TLS)
        ┌──────────────────────────────────┐
        │  Java socket gateway             │   RHEL 7 / 8 VMs
        │  - Holds ~5k sockets per VM      │   vertical scale (32 vCPU)
        │  - Java 8 / Netty 3              │   handcrafted HA pair per region
        └──────────────┬───────────────────┘
                       │ in-memory queue (JNI bridge)
                       ▼
        ┌──────────────────────────────────┐
        │  C/C++ message parser            │   Same VM, separate process
        │  - Type B / EDIFACT decoder      │   shared memory IPC to gateway
        │  - Routing rule engine           │   built with gcc 4.8 (sigh)
        └──────────────┬───────────────────┘
                       │ libpq
                       ▼
        ┌──────────────────────────────────┐
        │  PostgreSQL 11                   │   2-node streaming replication
        │  - Routing tables                │   manual failover (~15 min RTO)
        │  - Message journal (90d hot)     │   nightly pg_dump to NAS
        │  - End-of-day reconciliation     │
        └──────────────────────────────────┘
```

### Pain points the board signed off on

1. **Patch fragility.** RHEL kernel upgrades require a maintenance window, drain customers, and have caused 3 self-inflicted outages in the last 18 months.
2. **Capacity is bi-modal.** Day-of-operations peaks are 4× off-peak, but the VMs are sized for peak — ~$1.8M/yr of idle compute.
3. **No safe A/B.** Parser changes are scary; the only way to validate a new ruleset is to ship it and watch.
4. **DR is theatre.** The runbook says "fail to secondary region in 30 min." Reality is 90+ min, last drilled in 2022.
5. **Talent.** The C/C++ parser is maintained by 3 people; 2 of them retire in 2027.

### What is **not** on the table for the MVP

- Rewriting the C/C++ parser in another language. It moves as-is, in a container.
- Migrating PostgreSQL to a different engine. It moves to **Azure Database for PostgreSQL — Flexible Server**, same major version line.
- Changing the on-the-wire protocol. Airline endpoints connect exactly the same way; the gateway just lives somewhere new.

---

## Target architecture (the MVP this workshop builds)

```
   Airline endpoints                          Ops team (browsers)
         │                                          │
         ▼ persistent TCP                           ▼ HTTPS
  Azure Standard LB (TCP)                  Azure Front Door + WAF
         │                                          │
         ▼                                          ▼
  ┌────────────────────────── AKS (private API, 3 zones) ──────────────────────────┐
  │                                                                                 │
  │   gateway-java        parser-cpp        ops-console                            │
  │   (Java 21 / Netty)   (C++ 17, gcc 13)  (React, served by NGINX)               │
  │   StatefulSet         Deployment        Deployment                             │
  │   sticky by socket    KEDA-scaled       HTTP only                              │
  │       │                   ▲                                                    │
  │       └── in-mesh ────────┘ Service Bus or in-cluster NATS for backpressure    │
  │                                                                                │
  └─────────────────────────────────┬──────────────────────────────────────────────┘
                                    │
                                    ▼ libpq / azidentity
                       Azure DB for PostgreSQL Flexible Server
                       (HA, zone-redundant, geo-replica to westus3)
```

### Design moves the workshop will defend

| Move | Why | Where in the workshop |
|---|---|---|
| **Containerize first, refactor later.** Java gateway and C++ parser ship in containers with no source changes beyond a clean Dockerfile and a managed-identity-aware libpq config. | De-risks the move. The customer wins the operational benefits (autoscale, GitOps, zone-survival) without betting on a rewrite. | M03 |
| **AKS Standard, private API server, Azure CNI Overlay, 3 zones, Istio addon.** | Connection-oriented workloads on a public API server are an unforced error. Overlay scales sockets without VNet exhaustion. Istio gives us mTLS + ring-routing without a third-party install. | M00, M01, M02 |
| **`StatefulSet` for the gateway, headless Service, sticky by client IP at the NLB.** | Long-lived TCP sockets behave badly behind a Deployment that rolls Pods on every push. Sticky routing + stable identities keeps reconnect storms from happening every deploy. | M03 |
| **Azure Database for PostgreSQL Flexible Server, not in-cluster Postgres.** | The DB is the customer's crown jewel. Managed HA, PITR, geo-replication, and an SLA owned by Azure beat a self-managed StatefulSet for this workload. | M01 (IaC), M07 (failover) |
| **Front Door + WAF only for the ops console.** | Airline endpoints connect via L4 — Front Door doesn't add value for raw TCP. NLB + DNS + region-pair failover is the right shape. | M01, M07 |
| **A/B by parser version, not gateway version.** | The gateway holds the socket state; the parser is stateless per message. We A/B test parsers (`parser-cpp:v1` vs `parser-cpp:v2`) routed by Istio header match — the gateway tags each message with a cohort header. | M04 |
| **Rings: dev → canary → prod, prod manual.** | A bad parser ruleset can corrupt downstream reconciliation. Canary soaks for at least 5 minutes against synthetic load, and prod requires a human PR review **and** a manual Argo sync. | M05 |
| **Chaos against live sockets.** | Half of legacy outages were "we drained a node and nobody noticed the reconnect storm." We rehearse it on purpose. | M06, M07 |

---

## SLIs & SLOs the workshop is graded against

| SLI | Definition | SLO | Error budget (30 d) |
|---|---|---|---|
| Socket establishment success | % of TCP handshakes completing within 2 s | 99.95 % | 21m 36s |
| Message round-trip latency | P99 of *received-by-gateway → ack-from-parser* | < 250 ms | n/a (latency SLO) |
| Parser correctness | % of decoded messages where downstream replay matches input | 99.999 % | n/a (correctness) |
| Ops-console availability | % of `/ops/*` responses with status < 500 | 99.9 % | 43m 12s |
| DR drill | Cross-region failover RTO during a quarterly drill | < 5 min | n/a |

These drive Module 06 (intrinsic outage), Module 07 (extrinsic outage), and the L400 questions in the knowledge check.

---

## What the customer says success looks like at the end of the workshop

> "If we connect a single non-production airline partner to this MVP next Monday, it stays up for a full week of day-of-operations traffic, we can ship a parser rule change to canary without a maintenance window, and a planned zone failure doesn't make the on-call phone ring."

That sentence is the bar. Every module checks one piece of it.
