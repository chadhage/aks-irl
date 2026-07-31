# Module 04 — A/B Testing Parser Versions

**Time:** ~75 min  |  **Level target:** L300

**Success criterion this satisfies:** #2 — *Run an A/B test of a new parser version against live traffic.*

## 1. Outcomes

You can:

- Run `parser-cpp:v1` and `parser-cpp:v2` side-by-side as two subsets of the same Istio destination
- Shift gateway → parser traffic by **weight** (e.g., 90/10) without redeploying the gateway
- Switch to **header-based** routing (`x-cohort: beta`) so a chosen client cohort hits v2 only
- Read a Grafana panel split by `parser_version` to compare RTT and decode-error rates
- Cut traffic back to 100 % v1 in under 30 seconds (the kill switch)

## 2. Where this fits in the replatform story

The customer wants to ship a new routing rule into the C++ decoder without telling clients anything. The whole point of running on a mesh is that we can do this **at the parser leg only** — the gateway and its sockets don't move. This is the exact pattern they'll use every quarter for the rest of the year.

## 3. Level target

- **L300:** Weight-based and header-based routing both demonstrated; Grafana panel split by version.
- **L400:** Add an Argo Rollouts canary with automatic SLO-based promotion; encode the routing decision as a `WasmPlugin`.

## 4. Talk track *(trainer)*

Why we A/B at the **parser** not the **gateway**:
- Moving sockets to a new gateway version means tearing down TCP connections — visible to connected clients, ops-team-noticeable.
- The parser is stateless per request. Shifting 10 % of *decode* calls to v2 changes nothing visible at the client.

This is one of the highest-leverage architectural decisions in the whole replatform: by splitting "termination" from "decoding" we made parser releases boring.

## 5. Demo cues *(trainer)*

- Show the current `VirtualService` (100 % v1), edit it live to 90/10, and watch Grafana split.
- Then switch to header match and show in the ops console that messages tagged `x-cohort: beta` hit v2.

## 6. Participant steps

### 6.1 Build and push parser-cpp:v2
```bash
docker build --build-arg APP_VERSION=v2 -t $ACR/parser-cpp:v2 apps/parser-cpp
docker push $ACR/parser-cpp:v2
```

### 6.2 Deploy v2 alongside v1
Create `k8s/base/parser-cpp-v2.yaml` (copy `parser-cpp.yaml`, change `name: parser-cpp-v2`, `version: v2` labels, `image: ...:v2`, `APP_VERSION=v2`). Add to `k8s/base/kustomization.yaml`. Push.

### 6.3 Switch to 90/10 weighted routing
Edit the `VirtualService parser-cpp` in `k8s/base/istio-routing.yaml`:
```yaml
http:
  - route:
      - destination: { host: parser-cpp, subset: v1, port: { number: 9100 } }
        weight: 90
      - destination: { host: parser-cpp, subset: v2, port: { number: 9100 } }
        weight: 10
```
Push. Argo syncs. Watch:
```bash
for i in {1..200}; do
  printf 'COHORT default\nMSG QU/SYDYYXY/JFKYYXY/HDQTSXY/T/%d\n' $i | ncat $NLB 4561 -w 2
done | grep ACK | sort | uniq -c
```
Expect ~90/10 mix in the responses.

### 6.4 Switch to header-based routing
Replace the `http:` block with:
```yaml
http:
  - match:
      - headers:
          x-cohort: { exact: beta }
    route:
      - destination: { host: parser-cpp, subset: v2, port: { number: 9100 } }
  - route:
      - destination: { host: parser-cpp, subset: v1, port: { number: 9100 } }
```
The gateway forwards the `x-cohort` header set by the client's `COHORT beta` command. Test:
```bash
{ echo "COHORT beta"; echo "MSG QU/SYDYYXY/JFKYYXY/HDQTSXY/T/1"; sleep 1; } | ncat $NLB 4561
```
ACK should report `v2 fields=... priority=QU`. Default cohort hits v1.

### 6.5 Grafana split
Open Grafana → import the dashboard from `https://grafana.com/grafana/dashboards/7639` (Prometheus stats) and add a panel:
```promql
histogram_quantile(0.99, sum(rate(gateway_message_roundtrip_seconds_bucket[5m])) by (parser_version, le))
```
You should see two series; predict which one is higher before looking.

### 6.6 Kill-switch drill
Time yourself: revert the `VirtualService` to 100 % v1, push, watch Argo sync. Target ≤ 30 s from "decision to roll back" to "100 % v1 serving".

## 7. Validation

- Both `parser-cpp` and `parser-cpp-v2` Deployments running with their Pods healthy.
- Weighted run shows ~90/10 mix in client responses.
- Header-based run sends `beta` cohort to v2 and everything else to v1.
- Grafana panel split by `parser_version` renders two distinct series.
- Kill-switch reverted in ≤ 30 s.

## 8. Stretch (L400)

- Replace the hand-edited `VirtualService` with an **Argo Rollouts** AnalysisTemplate that auto-promotes v2 to 50 % only if decode-error rate stays below 0.01 %.
- Express the routing rule as an Istio **WasmPlugin** that hashes connection-IDs and routes odd hex values to v2 — useful for stable per-client A/B.

## 9. Cleanup

Revert routing to 100 % v1. Leave both Deployments running for M05 (the ring promotion will use v2 as its "new" artifact).
