# Module 07 — Surviving an Extrinsic Outage

**Duration:** 75 min  |  **Level target:** L300 → L400  |  **Day:** 2

**Success criterion this satisfies:** #5 — *Survive an extrinsic outage that causes service interruptions.*

> **Definition.** "Extrinsic" means the cause is **outside your cluster** — region offline, dependent PaaS down, DNS poisoning, edge ISP failure. Your primary cluster is *gone or unreachable*; you must move customers elsewhere.

## Outcomes
- Pre-stage the secondary cluster in westus3 with the same workloads (warm-passive)
- Promote it to active behind Azure Front Door
- Recover when the primary returns, **without dual-writing** the unprepared way
- Calculate observed RTO and RPO

## Whiteboard prompts (5 min)
1. What state lives only in the cluster? Where is the long-lived state actually persisted?
2. Why is **warm passive** preferred to **cold standby** for a 4× growth workload?
3. What would a true active-active design require that warm-passive doesn't?

## Pre-flight (10 min) — warm the secondary
```bash
# Apply the same Argo CD bootstrap pointed at the secondary cluster
RG2=$(terraform output -raw secondary_resource_group)
AKS2=$(terraform output -raw aks_secondary_name)
az aks command invoke -g $RG2 -n $AKS2 --command "kubectl create namespace argocd"
az aks command invoke -g $RG2 -n $AKS2 --command "kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.12.4/manifests/install.yaml"
# ... same project + apps as Module 03
```

By construction, the secondary cluster runs the same prod ring images (Argo CD pulls from the same GitOps repo). The Front Door origin group already has it as **priority 2**.

```bash
# Confirm both origins are healthy in the Azure Portal:
# Front Door → Origin groups → apps → both green
```

## Step 1 — Simulate a primary region outage
Two ways to do this, pick one:

**Surgical:** Disable the primary origin in Front Door, forcing failover within 30 s.
```bash
FD_RG=$(terraform output -raw primary_resource_group)
FD_PROFILE=$(az afd profile list -g $FD_RG --query "[0].name" -o tsv)
az afd origin update --profile-name $FD_PROFILE -g $FD_RG \
  --origin-group-name apps --origin-name primary --enabled-state Disabled
```

**Brutal:** Stop the primary AKS cluster (preserves state, instantly kills traffic).
```bash
az aks stop -g $RG -n $AKS
```

Start a generator against Front Door:
```bash
hey -z 5m -c 30 $FD/api/products
```

## Step 2 — Watch the failover
- Front Door **probe failure** for primary within ~30 s
- Traffic shifts to secondary (priority 2)
- Customer error rate spikes briefly, then recovers
- Capture the exact recovery time — that's your **observed RTO**

## Step 3 — Recover
Re-enable primary:
```bash
az afd origin update ... --enabled-state Enabled
# or
az aks start -g $RG -n $AKS
```

Front Door rebalances by priority once primary is healthy. **Do not let traffic flood back instantly** — set primary `weight` low first, then ramp.

## Step 4 — Compute RTO and RPO
- **RTO (Recovery Time Objective):** how long was the customer error rate above SLO?
- **RPO (Recovery Point Objective):** for this stateless app, RPO ≈ 0 because the data store is external. For a stateful app, RPO is driven by storage replication; document the answer for *your imagined* persistence (Cosmos DB multi-region writes, Azure SQL geo-replication, etc).

## Validation
- Curl loop against Front Door shows non-zero responses throughout the experiment
- Grafana shows traffic shift from primary to secondary clusters
- Front Door diagnostic logs confirm probe-driven failover
- Each squad writes their observed RTO/RPO into `modules/07-extrinsic-outage/incident-region.md`

## Stretch (L400)
- Replace warm-passive with **active-active**: weight both origins 50/50; introduce a shared session store (Redis Enterprise active-geo).
- Implement **manual failover gates** (don't trust autoflip alone). When *should* an operator override?
- Add a **stuck transaction** scenario: a Service Bus message in-flight at failover. Where does it land?

## Cleanup
- Re-enable primary origin
- Stop the load generator
- Set Front Door weights back to default
