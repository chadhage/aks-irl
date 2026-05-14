# Grading rubric

Use this alongside [`knowledge-check.md`](knowledge-check.md). Each answer is scored 0–5 unless noted.

## 5-point scale
- **5** — Correct, complete, and surfaces a non-obvious trade-off.
- **4** — Correct and complete.
- **3** — Mostly correct; minor inaccuracy or missing nuance.
- **2** — Partially correct; key concept missing.
- **1** — Demonstrates exposure; mostly wrong.
- **0** — Blank or fundamentally wrong.

## Section weighting

| Section | Pts | Level signal |
|---|---|---|
| A. Foundations | 25 | High L200 floor |
| B. Build & deploy | 25 | L300 |
| C. Traffic & rings | 20 | L300 (C4 is L400) |
| D. Surviving outages | 20 | L300 (D4 is L400) |
| E. Operations & cost | 10 | L300 |
| L400 extension | +10 | Architectural maturity |

## Reference answers

> Try the questions first — then compare your answers here.

### A1 — Day-0 decisions
Accept any 3 from: API server private/public, Pod IP model (CNI Overlay vs VNet), zones (must include all 3 from day one), Node OS (Azure Linux vs Ubuntu), region pair, service mesh choice (Istio addon vs none).
Hard-to-reverse = requires Cluster rebuild or surge nodepool migration with downtime.

### A4 — `local_account_disabled`
Buys: no out-of-band kubeconfig route to the Cluster, all access via Entra. Costs: break-glass requires the **Cluster Admin** Entra role pre-assigned; without it, you're locked out during an Entra outage.

### C3 — DestinationRule
Required because subset labels are defined there. Without it: Istio cannot route to "subset v1" (rejects the VirtualService), and `outlierDetection`/`trafficPolicy` defaults to mesh-wide settings, breaking circuit breakers.

### D3 — Slow recovery on failover
Likely causes: DNS TTL (>30 s), keep-alive connections held open by client, Front Door probe interval default 30 s + 3 failures = ~90 s detection. Make it 30 s by lowering probe interval, requiring fewer successful samples, and ensuring TCP_NODELAY/short keep-alive on backend.

(... continue per question; expand as you self-study.)

## Self-calibration

If you scored under 60% on sections C or D, revisit modules 03–05 (rings/traffic) and 06–07 (outages) — these are the level-determining sections.
