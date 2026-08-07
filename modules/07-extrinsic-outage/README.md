# Module 07 — Extrinsic Outage & Cross-Region Failover

**Time:** ~90 min wall-clock  |  **Level target:** L300

**Success criterion this satisfies:** #5 — *Survive an extrinsic outage with cross-region failover.*

## 1. Outcomes

You can:

- Bootstrap the **secondary** cluster (westus3) so it can serve the same workload as primary
- Move active socket traffic from primary to secondary by swapping a DNS record
- Quantify the RTO (time for sockets to reconnect to secondary) and RPO (messages in-flight at cutover)
- Recover back to primary in a controlled window — Postgres replication lag drained first
- Document one cross-region incident

## 2. Where this fits in the replatform story

Skybridge's regulator imposes RTO ≤ 30 min and RPO ≤ 1 min for the message journal. The legacy stack technically has a passive datacentre but the failover playbook is "tell the clients to reconnect to a different VIP and pray". This module turns that into a measured, reversible operation.

## 3. Level target

- **L300:** Surgical DNS-swap failover and measured recovery.
- **L400:** Add a "brutal" `az aks stop` scenario; quantify the difference; design a third-region cold standby strategy.

## 4. Talk track *(trainer)*

Two ideas to lead with:
1. **RTO for a socket workload is not "the LB is up".** It's "the displaced sockets have reconnected and resumed message exchange". Measure end-to-end, not edge.
2. **Postgres geo-replication is async.** Anything in-flight at the moment of failover is at risk. Communicate that to the customer — the architecture caps loss, it doesn't eliminate it.

## 5. Demo cues *(trainer)*

- Walk through the DNS swap on your demo lab first so the room sees the mechanism.
- During the wait for sockets to reconnect, open the Postgres replica's lag panel and narrate what RPO looks like in real time.

## 6. Participant steps

Use Activities **M07.1–M07.6** in [LAB-GUIDE-ACTIVITIES.md](../../LAB-GUIDE-ACTIVITIES.md). Database promotion and DNS changes are shared-state operations: complete one action, capture its evidence, and stop if its confirmation fails.

1. Bootstrap and validate the secondary GitOps controller.
2. Record replica lag below 5 seconds with a timestamp.
3. Establish a stable sustained-socket baseline.
4. Pass all four failover preconditions, quiesce writes, promote one database writer, then change DNS.
5. Calculate RTO and RPO with units and method.
6. Re-establish replication, pre-scale primary, converge lag, promote one writer, and only then change DNS back.

Do not combine database promotion and DNS updates into one command block. The drill is complete only when exactly one Postgres server accepts application writes and the traffic baseline is stable for 60 seconds.

### Optional brutal failover

Run `az aks stop` only when the trainer confirms the secondary is serving 100% of traffic, the regional failover recovery gate has passed, and at least 10 minutes remain to restart and validate the primary. Record the cluster state before stopping it. Recovery requires `az aks start`, ready nodes, healthy Argo applications, and no traffic move until the normal preconditions pass again.

## 7. Validation

- Secondary cluster served the entire workload for at least 5 minutes.
- Recorded RTO < 5 min and RPO measured in messages (not "unknown").
- Recovered without flooding primary.
- No Postgres split-brain.

## 8. Stretch (L400)

- Replace the DNS swap with **Traffic Manager** priority-based failover and compare the RTO.
- Add a third "cold" region (centralus) that you provision on demand with `terraform apply` during the drill; measure cold-start RTO.
- Build a runbook that the customer NOC can execute without you in the room. Rehearse it.

## 9. Cleanup

DNS back to primary. Stop the synthetic-load generator. Scale secondary cluster's `gateway-java` STS back to 2 replicas to save cost.
