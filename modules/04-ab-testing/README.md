# Module 04 — A/B Testing with Istio

**Time:** ~60 min  |  **Level target:** L300 → L400

**Success criterion this satisfies:** #2 — *Extend the MVP and add A/B testing.*

## Outcomes
- Deploy `api-node:v2` alongside v1 in the same namespace
- Split traffic 90/10 via Istio `VirtualService` weights
- Route a specific user cohort to v2 via **header-based** match
- Measure per-version P95 latency and error rate in Grafana, then promote v2

## Things to think through first
1. Where in the request path does the version split actually happen — at Front Door, ingress gateway, sidecar, or all three?
2. Why is the **DestinationRule** mandatory even if you only have one subset?
3. If v2 has a memory leak, what's your kill switch and how fast can you pull it?

## Step 1 — Build & push v2
The base app honors `APP_VERSION` and exposes a different payload (`rating` field) in v2.

```bash
docker build --build-arg APP_VERSION=v2 -t $ACR/api-node:v2 apps/api-node
docker push $ACR/api-node:v2
```

## Step 2 — Deploy the v2 Deployment
Apply this directly via `kubectl` (we're in dev — short feedback loop):
```yaml
# k8s/overlays/dev/api-node-v2.yaml  -- add to overlay and commit, OR apply inline for the lab
apiVersion: apps/v1
kind: Deployment
metadata: { name: api-node-v2, namespace: app-dev, labels: { app: api-node, version: v2 } }
spec:
  replicas: 2
  selector: { matchLabels: { app: api-node, version: v2 } }
  template:
    metadata:
      labels: { app: api-node, version: v2 }
    spec:
      containers:
      - name: api
        image: REPLACE/api-node:v2
        ports: [{ containerPort: 8080, name: http }]
        env: [{ name: APP_VERSION, value: v2 }]
        readinessProbe: { httpGet: { path: /readyz, port: http } }
        resources:
          requests: { cpu: 50m, memory: 64Mi }
          limits:   { cpu: 500m, memory: 256Mi }
```

## Step 3 — Weighted split (90 → 10)
The base `VirtualService` sends 100% to subset `v1`. Patch it:
```yaml
# Apply against the dev ring
spec:
  http:
    - match: [{ uri: { prefix: "/api/" } }]
      route:
        - destination: { host: api-node, subset: v1 }
          weight: 90
        - destination: { host: api-node, subset: v2 }
          weight: 10
```

Validate:
```bash
for i in {1..200}; do curl -s http://$IP/api/products | jq -r .version; done | sort | uniq -c
# expect ~180 v1, ~20 v2
```

## Step 4 — Header-based routing (the L400 trick)
Send all customers in a cohort to v2 via a header set at the edge (or by your auth gateway):
```yaml
spec:
  http:
    - match:
        - uri: { prefix: "/api/" }
          headers: { x-cohort: { exact: "beta" } }
      route:
        - destination: { host: api-node, subset: v2 }
    - match: [{ uri: { prefix: "/api/" } }]
      route:
        - destination: { host: api-node, subset: v1 }
```
```bash
curl -H 'x-cohort: beta' http://$IP/api/products | jq .version  # → v2
curl                     http://$IP/api/products | jq .version  # → v1
```

## Step 5 — Compare versions in Grafana
Open the **AKS / Istio / Service** dashboard. Both versions should show distinct timeseries (use the `version` label that the app exposes through Prometheus). Look at:
- P95 latency per version
- Error rate per version
- Throughput per version

Decide: promote v2 by shifting weights to 50/50, then 100/0. Roll back instantly by reverting weights.

## Validation
- `version: v2` appears in ~10 % of responses with default weights
- `x-cohort: beta` deterministically routes to v2
- Grafana shows two distinct latency series labeled `v1` and `v2`

## Stretch (L400)
- Add an Istio **mirror** so v2 receives a copy of all real traffic without affecting users.
- Implement **circuit breaking** in the `DestinationRule` for v2 only — pull it out of rotation on 5xx burst.
- Combine with **Argo Rollouts** for automated analysis-driven promotion.

## Cleanup
- Revert the `VirtualService` to 100 % v1 before Module 05 so the canary ring starts from a known state.
