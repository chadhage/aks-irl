# Module 08 — Optimization

**Time:** ~45 min  |  **Level target:** L300 (L400 stretch on right-sizing without socket churn)

## 1. Outcomes

You can:

- Right-size `gateway-java` and `parser-cpp` resource requests from real Grafana data
- Schedule the `parser-cpp` batch reconciler on a **spot** node pool with the correct toleration
- Drive `parser-cpp` `0 → N → 0` with KEDA based on parser queue depth (or HTTP RPS)
- Adjust `gateway-java` without triggering a reconnect storm (PDB + termination grace + readiness gating)

## 2. Where this fits in the replatform story

Once the customer has the platform running and trusted, the next conversation is always cost. The two levers that matter most here are *right-sizing the gateway* (which over-provisions by default to absorb reconnect storms) and *scaling the parser to zero in quiet periods* (overnight, between traffic peaks).

## 3. Level target

- **L300:** Right-size requests; spot pool for parser batch; KEDA for parser.
- **L400:** Tune `gateway-java` JVM (G1 → ZGC), keepalive intervals, and Linux net.core sysctls on the node pool to push P99 RTT down 20 %.

## 4. Talk track *(trainer)*

- Don't "right-size" by Pod restart loop — measure first, then size, then redeploy once.
- Spot is great for *parser* (stateless, retry-friendly). Spot is **dangerous** for the *gateway* (state on the wire). Make that distinction explicit.
- KEDA is the right answer when "queue depth" is the leading indicator; HPA on CPU is the right answer when steady-state CPU tracks load. They coexist.

## 5. Demo cues *(trainer)*

- Open Grafana → `kubectl_pod_container_resource_requests` vs actual usage panels. Show the over-provisioning on a real workload.
- Apply a right-size and watch the rollout — narrate the StatefulSet's `RollingUpdate` and how `terminationGracePeriodSeconds: 120` plus PDB protects sockets.

## 6. Participant steps

Use Activities **M08.1–M08.3** in [LAB-GUIDE-ACTIVITIES.md](../../LAB-GUIDE-ACTIVITIES.md). Complete and confirm each optimization independently so one change cannot hide another change's impact.

1. **Spot:** review a no-replacement Terraform plan, create the pool, verify its labels, and schedule only the batch parser workload there.
2. **KEDA:** prove the controller is ready and the Prometheus query returns data before applying a `ScaledObject`; observe a complete `0 → N → 0` cycle.
3. **Right-sizing:** record P95 and the safety-margin calculation, prove the gateway drain contract, make a resource-only diff, and watch every StatefulSet replacement under sustained sockets.

The live parser request path and socket gateway must remain on regular nodes. Do not proceed with the right-size rollout unless you have verified the repository's `/drain` endpoint, readiness transition, 110-second application drain timeout, and 120-second pod grace period.

### 6.4 Cost-saving snippet for breaks
Park user node pools without destroying anything:
```bash
# edit terraform.tfvars
node_pool_user_min = 0
node_pool_user_max = 0
terraform apply
```

## 7. Validation

- `gateway-java` requests reflect Grafana-observed P95 (within 20 %).
- Parser batch Pods land on spot Nodes (check `kubectl get pods -o wide` + node labels).
- KEDA scales parser to zero in idle periods and back up under load.
- The right-size rollout did **not** drop your active-socket count below the baseline.

## 8. Stretch (L400)

- Tune JVM: switch `gateway-java` to ZGC (already in Dockerfile), drop max-heap to right-sized request, measure GC pause vs RTT P99.
- Push Linux net sysctls on the gateway node pool: `net.core.somaxconn`, `net.ipv4.tcp_max_syn_backlog`, `net.ipv4.tcp_tw_reuse`. Measure SYN handling under burst load.
- Move parser to **Node Auto Provisioning** (Karpenter) and compare cold-start latency to spot.

## 9. Cleanup

If you're done with the workshop:
```bash
cd infra/terraform/envs/lab
terraform destroy
```
Verify in the portal that all resource groups, Front Door, and **Postgres backups** are gone.
