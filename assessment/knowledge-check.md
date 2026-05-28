# Final Knowledge Check

Answer in `assessment/submissions/answers.md` and commit. Sections A–E are required; F is L400 bonus.

Read [assessment/rubric.md](rubric.md) before you start — the rubric is open. Self-grade against it after you finish.

---

## A. Scenario & SLOs

**A1.** In two sentences, what is the Skybridge MVP replacing and what is it *not* replacing in this engagement?

**A2.** Write the SLO and 30-day error budget for the gateway's socket-establishment success SLI. Why is "% of HTTP 2xx" the wrong SLI for this workload?

**A3.** Pick one SLI from the workshop and propose a leading indicator the NOC could put on a dashboard to catch a burn before the SLO breaches.

## B. Day-0 architecture

**B1.** Of the 9 Day-0 decisions, pick **two** and write the *rejected* alternative with one specific reason it was rejected for Skybridge.

**B2.** Why is `gateway-java` a StatefulSet and not a Deployment? What would change if it were a Deployment?

**B3.** Why is PostgreSQL outside the cluster (Azure DB for PostgreSQL — Flexible Server) and not a Helm-installed Postgres? Name two specific risks of the in-cluster choice.

## C. Identity, security, routing

**C1.** Trace the steps by which `gateway-java` authenticates to PostgreSQL **without a static password**. Name every component involved.

**C2.** A teammate proposes putting Front Door in front of the TCP socket port (4561). Refute or accept in two sentences.

**C3.** A new airline cohort wants to test parser v2 only on their traffic. Write (in words or YAML) how you would route their traffic to v2 without affecting anyone else.

## D. GitOps, rings, rollback

**D1.** Why is auto-sync **disabled** for `ring-prod`? What would break if you enabled it?

**D2.** A bad parser version is in prod. Compare Argo UI rollback vs Git revert PR. When is each correct?

**D3.** You ran `kubectl edit deploy parser-cpp` to "quickly fix" prod. What will Argo CD do, and within how long?

## E. Outage & failover

**E1.** A zone goes dark. List, in order, the three Kubernetes/Azure mechanisms that protect socket-connected airlines.

**E2.** You executed a region failover. Sockets reconnected in 90 s but P99 RTT stayed elevated for 4 minutes after. Why?

**E3.** Your observed RPO during failover was "12 messages". What does that number actually mean, and how would you reduce it?

## F. L400 bonus

**F1.** Design a third-region cold standby. What's the cost vs RTO trade-off?

**F2.** The parser's CPU graph spikes every 60 seconds in a saw-tooth pattern. Hypothesise three causes and propose how you'd discriminate among them.

**F3.** Propose a way to express the gateway → parser A/B rule as code (Argo Rollouts, WasmPlugin, or other) such that an SLO regression auto-rolls back without human action. Sketch the control loop.
