# Module 08 — Optimization & Cost

**Duration:** 45 min  |  **Level target:** L300 (L400 stretch)  |  **Day:** 2

## Outcomes
- Turn on the spot node pool and steer batch work to it
- Add a KEDA `ScaledObject` so the worker scales on queue depth (or CPU as a stand-in)
- Right-size CPU/memory requests using actual usage data
- Read the cost analysis add-on and Grafana cost dashboard

## Step 1 — Enable spot
Set `enable_spot_pool = true` in `terraform.tfvars` and `terraform apply`. Verify:
```bash
kubectl get nodes -l workload=batch
```

Patch the worker to tolerate the spot taint:
```yaml
spec:
  template:
    spec:
      tolerations:
        - key: kubernetes.azure.com/scalesetpriority
          operator: Equal
          value: spot
          effect: NoSchedule
      nodeSelector:
        workload: batch
```

## Step 2 — KEDA
```bash
az aks update -g $RG -n $AKS --enable-keda
```
Apply a `ScaledObject` driving the worker on `worker_processed_total` rate from Prometheus:
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata: { name: worker, namespace: app-prod }
spec:
  scaleTargetRef: { name: worker-python }
  minReplicaCount: 0
  maxReplicaCount: 20
  pollingInterval: 15
  cooldownPeriod: 60
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring.svc:9090
        query: sum(rate(worker_processed_total[1m]))
        threshold: "10"
```
Drive load via `LATENCY_MS=0 WORK_SLEEP_MS=10` env tweak and watch replica count climb then drop to zero.

## Step 3 — Right-sizing
Open Grafana → **Workloads** → `api-node`. If CPU usage P95 is far below `requests`, lower `requests` and reapply. Same for memory.

For a guided pass, install the **Goldilocks** controller (optional) or use Vertical Pod Autoscaler in `recommender` mode.

## Step 4 — Cost analysis
Enable the AKS Cost Analysis add-on (already configured in Terraform via Container Insights). Open **Cost analysis** scoped to the resource group, group by **Namespace**. Note the cost per ring.

## Validation
- Worker scales from 0 → N → 0 within 5 min based on synthetic load
- `kubectl describe pod -l app=worker-python` shows scheduled on a `spot` node
- Documented "before/after" requests and observed cost reduction in `modules/08-optimization/sizing.md`

## Stretch (L400)
- Enable **Node Auto-Provisioning** (NAP) and remove the static user pool. Compare scale-up latency.
- Add a **Karpenter-style** mixed SKU strategy: D-series for bursty steady state, E-series for memory-heavy workers.
- Implement an **off-hours scaler** (CronScaledObject) that drops min replicas to 1 at night.
