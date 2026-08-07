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

Use the canonical one-action-at-a-time runbook in [LAB-GUIDE-ACTIVITIES.md](../../LAB-GUIDE-ACTIVITIES.md). Do not run a scenario as a command loop or continue past a failed confirmation.

1. **M06.1:** establish the three-pane baseline and confirm it is stable for 60 seconds.
2. **M06.2:** delete three parser pods individually, confirming recovery and SLO after each deletion.
3. **M06.3:** remove the PDB only after the change gate; restore it from Git and pass the recovery gate.
4. **M06.4:** inject the bad parser, start the rollback timer at the agreed error threshold, then reconcile both runtime and Git state.
5. **M06.5:** trigger the zonal experiment only after proving surviving-zone capacity; cancel or complete it and restore zone spread.
6. **M06.6:** attach one screenshot per scenario and commit the incident summary.

The activity guide contains the exact confirmations, thresholds, and recovery evidence for each step. A scenario is incomplete until its **RECOVERY GATE** passes.

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
