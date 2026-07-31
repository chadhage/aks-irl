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

### 6.1 Bootstrap Argo CD on the secondary cluster
Same as M03, against the secondary cluster name & RG. Verify `messaging-canary` and `messaging-prod` are running v1 with synthetic sockets idle (no live traffic yet).

### 6.2 Confirm Postgres geo-replica health
```bash
az postgres flexible-server replica list -g $RG_PRIMARY --name $PG_PRIMARY -o table
# lag should be < 5 s
```

### 6.3 Start sustained load against the primary
```bash
./scripts/smoke.sh tcp $NLB_PRIMARY 4561 500 --keep-alive &
```
Let it run 5 min; confirm steady RTT in Grafana.

### 6.4 Surgical failover — swap the DNS record
You created `messaging.<lab>.example.com` in M03 pointing at `$NLB_PRIMARY`. Swap it to `$NLB_SECONDARY`:
```bash
az network dns record-set a update -g $DNS_RG -z $DNS_ZONE -n messaging \
  --set 'aRecords=[{"ipv4Address":"'$NLB_SECONDARY'"}]' --ttl 30
```
Start a stopwatch. Wait for displaced sockets to reconnect (your generator's clients try every 5 s).

**Promote the Postgres replica:**
```bash
az postgres flexible-server replica promote -g $RG_SECONDARY --name $PG_SECONDARY
```

### 6.5 Measure RTO and RPO
- **RTO:** seconds from DNS swap to "≥ 99 % of expected sockets are connected on secondary"
- **RPO:** messages produced on primary in the last `replication_lag` seconds — count from the generator's local log

### 6.6 (Optional) Brutal failover
```bash
az aks stop -g $RG_PRIMARY -n $AKS_PRIMARY
```
Watch what changes — TCP `RST` vs graceful close changes how fast clients reconnect.

### 6.7 Recover
1. Drain replication lag (now reversed): wait until secondary→primary lag is < 5 s.
2. Promote primary back to read-write.
3. Swap DNS back to `$NLB_PRIMARY`.
4. Monitor that the primary does not "cold-start storm" — HPA may need to scale gateway up before the swap.

### 6.8 Document
Write `modules/07-extrinsic-outage/incident-region.md`:
- Observed RTO / RPO
- What surprised you
- What you would change to halve the RTO

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
