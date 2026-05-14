# Module 06 — Surviving an Intrinsic Outage

**Duration:** 90 min  |  **Level target:** L300 → L400  |  **Day:** 2

**Success criterion this satisfies:** #4 — *Survive an intrinsic outage that causes service degradation.*

> **Definition.** "Intrinsic" means the cause is **inside your cluster** — a bad deploy, a noisy neighbor, a failing node, an exhausted PVC. The cluster is still online; *your service* is degrading. Customers see elevated latency or partial 5xx, not a hard outage.

## Outcomes
- Use Chaos Studio / `kubectl` to deliberately degrade the prod ring
- Observe SLO burn in Grafana within 60 s
- Survive via PDBs + HPAs + topology-spread + Istio outlier detection
- Capture a post-incident timeline aligned to the SLI

## Whiteboard prompts (5 min)
1. What's the difference between liveness and readiness, and which one matters for graceful degradation?
2. Why won't an HPA save you from a CPU stampede if your `requests` are wrong?
3. How does Istio outlier detection complement Kubernetes readiness?

## Scenarios (run any three; 20 min each)

### 6A — Pod-level chaos: random kill
```bash
# Kill 1 random api-node pod every 30s for 5 minutes
kubectl -n app-prod label pods -l app=api-node chaos=ok --overwrite
for i in $(seq 1 10); do
  POD=$(kubectl -n app-prod get pods -l app=api-node -o name | shuf -n 1)
  kubectl -n app-prod delete $POD
  sleep 30
done
```
**Expected:** PDB (`minAvailable: 2`) prevents simultaneous kills from breaking SLO. Front Door health probes stay green.

**Break it:** lower `minAvailable` to 0 and re-run — SLO breaches in ~90 s. Restore.

### 6B — Resource starvation: noisy neighbor
Deploy a CPU hog in the same namespace:
```bash
kubectl -n app-prod run hog --image=polinux/stress --restart=Never -- \
  stress --cpu 8 --timeout 300
```
Watch `api-node` latency P95 climb. Mitigations to demonstrate:
- **CPU requests** on `api-node` give it a guaranteed slice
- **Pod-level priority class** for `api-node` (PriorityClass `high`) so the hog is evicted first
- **Resource quota** on the namespace caps a single tenant

### 6C — Node failure: cordon + drain
```bash
NODE=$(kubectl get nodes -l workload=apps -o name | head -1)
kubectl cordon $NODE
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data --grace-period=60
```
**Expected:** Pods reschedule across remaining zones (topology spread constraints kick in). HPA may scale up if load increases.

### 6D — Zone failure (using Chaos Studio)
Apply the prepared Chaos Studio experiment:
```bash
cd chaos
az deployment group create -g $RG -f zone-failure-experiment.bicep -p clusterName=$AKS zone=2
az resource invoke-action --action start --ids $(az resource show -g $RG -n sita-zone-failure --resource-type Microsoft.Chaos/experiments --query id -o tsv)
```
The experiment cordons all nodes in zone 2 for 10 minutes. With `zones: [1,2,3]` on every pool and `topologySpreadConstraints`, the workload survives in zones 1 and 3.

### 6E — Bad code rollout (latency injection)
Deploy `api-node:v1-bad` (already built) which injects `LATENCY_MS=2000` and `FAIL_RATE=0.2`:
```bash
kubectl -n app-prod set image deploy/api-node api=$ACR/api-node:v1-bad
```
**Mitigations to demonstrate:**
- Istio `outlierDetection` ejects bad pods (already configured in base `DestinationRule`)
- Rollback via Argo CD UI in < 30 s
- Argo Rollouts auto-abort on SLO breach (L400 stretch)

## Step 2 — Post-incident debrief
For one scenario you ran:
- Plot the SLI (success rate) over the experiment window
- Compute the **error budget consumed**
- Write a 5-line post-incident summary (cause / detection / mitigation / customer impact / follow-up)

This artifact is **graded in the knowledge check**.

## Validation
- Front Door uptime stays > 99 % across all scenarios
- Each scenario produces a Grafana screenshot annotated with start/end markers
- One written incident summary committed at `modules/06-intrinsic-outage/incident-<scenario>.md`

## Stretch (L400)
- Define an **error budget burn-rate alert** in Azure Monitor (fast: 2 % in 1 h; slow: 10 % in 6 h)
- Wire the alert to **PagerDuty** or Teams via an Action Group
- Add a `PodDisruptionBudget` to the worker that allows zero voluntary disruptions during business hours

## Cleanup
- Reset any deployments you mutated:
  ```bash
  kubectl -n app-prod set image deploy/api-node api=$ACR/api-node:v1
  kubectl -n app-prod delete pod hog --ignore-not-found
  kubectl uncordon $NODE 2>/dev/null
  ```
