# Module 06 — Intrinsic Outage

**Time:** ~90 min  |  **Level target:** L300

**Success criterion this satisfies:** #4 — *Survive an intrinsic outage without dropping client sockets.*

## 1. Outcomes

You will have, against **live socket traffic**:

- Killed parser Pods in a loop and watched PDB + mesh retries keep RTT inside SLO
- Rolled out a deliberately-broken `parser-cpp:bad` and rolled it back inside your kill-switch target
- Drained an entire zone of `gateway-java` Pods and observed the reconnect storm hit the surviving zones
- Recorded one Grafana screenshot per scenario and written a 5-line incident summary

## 2. Where this fits in the replatform story

In the legacy stack, scenario A (Pod kill) is "a JVM crashes — the client's sockets drop, the NOC scrambles". Scenario C (zone drain) doesn't even have an analog — the whole datacentre is single-AZ. This module proves that the new platform absorbs failures that the old one couldn't survive.

## 3. Level target

- **L300:** Run all three scenarios, screenshot, write incident summary for one.
- **L400:** Add the chaos experiments to a recurring GH Action so they run nightly in the lab environment.

## 4. Talk track *(trainer)*

Set the "war room" up before any participant runs a scenario — this is the single most important framing of the day. Three things on every screen:
1. Grafana — `gateway_active_connections` + `gateway_message_roundtrip_seconds_p99` panels.
2. `kubectl get pods -n messaging-prod -w` in another pane.
3. The synthetic socket generator (`scripts/smoke.sh tcp ... --keep-alive`) churning steady traffic.

Then introduce the principle: *each scenario isolates one failure domain. We are not testing the platform's average behavior; we are testing its blast-radius edges.*

## 5. Demo cues *(trainer)*

- Run scenario A live (the Pod-kill loop) on the projector first. Show the **non-spike** in the RTT panel. Then break the PDB (`minAvailable: 0`), repeat, show the SLO breach. **Restore the PDB.**
- Tease scenario C: "an entire zone is going to go dark in 60 seconds. Watch the surviving-zone CPU and the reconnect storm." Then deploy the Chaos Studio experiment.

## 6. Participant steps

### Scenario A — Pod kill on the parser
```bash
./scripts/smoke.sh tcp $NLB 4561 200 --duration 300s &     # background load
for i in {1..12}; do
  POD=$(kubectl -n messaging-prod get pods -l app=parser-cpp -o jsonpath='{.items[0].metadata.name}')
  kubectl -n messaging-prod delete pod $POD --wait=false
  sleep 5
done
```
Watch Grafana — RTT should not spike past SLO.

Then deliberately break the PDB to `minAvailable: 0` and repeat. Watch the SLO break. **Restore the PDB before you move on.**

### Scenario B — Bad parser rollout
```bash
docker build --build-arg APP_VERSION=bad -t $ACR/parser-cpp:bad apps/parser-cpp
docker push $ACR/parser-cpp:bad
# Hand-edit k8s/overlays/prod/kustomization.yaml to tag :bad (do NOT use the gated PR flow — this is intentional misuse)
git add -A; git commit -m "drill: bad parser"; git push
# Argo syncs. Grafana breaks. Time how long you take to roll back.
```
Target rollback: < 2 minutes. Record actual time.

### Scenario C — Zone drain on the gateway (Chaos Studio)
```bash
az deployment group create -g $RG -f chaos/zone-failure-experiment.bicep \
  -p clusterName=$AKS zone=2 region=eus2
az rest --method post \
  --uri "https://management.azure.com/subscriptions/$SUB/resourceGroups/$RG/providers/Microsoft.Chaos/experiments/skybridge-zone-failure/start?api-version=2024-01-01"
```
Watch:
- `gateway_active_connections` drop by ~⅓ as zone-2 Pods are killed
- A reconnect storm hits zones 1 + 3 — they should absorb it (HPA may scale them up)
- Confirm ≥ 99 % of displaced sockets reconnect within 30 s

### Write up one incident
Pick the most interesting scenario. Write 5 lines into `modules/06-intrinsic-outage/incident-<scenario>.md`:
1. What was the trigger?
2. What did Grafana show?
3. What protected the workload (or didn't)?
4. What would you change?
5. What SLO budget did you spend?

Commit and push.

## 7. Validation

- All three scenarios executed.
- One Grafana screenshot per scenario in `modules/06-intrinsic-outage/screenshots/`.
- One incident write-up committed.
- You can answer: *what protected the workload in scenario A vs C?*

## 8. Stretch (L400)

- Add a 4th scenario: Postgres failover (`az postgres flexible-server restart --failover Forced`). Measure the gateway's reconnect-to-DB latency.
- Add chaos as code via the GH Action so this runs every night against `messaging-dev`.
- Add Istio **fault injection** at 5 % for the parser leg and write a SLO query that distinguishes injected faults from real ones.

## 9. Cleanup

Stop and delete the Chaos experiment:
```bash
az rest --method post --uri ".../experiments/skybridge-zone-failure/cancel?api-version=2024-01-01"
az resource delete --ids $(az resource show -g $RG -n skybridge-zone-failure --resource-type Microsoft.Chaos/experiments --query id -o tsv)
```
Restore the PDB if you broke it. Confirm `gateway-java` is back to its baseline replica count.
