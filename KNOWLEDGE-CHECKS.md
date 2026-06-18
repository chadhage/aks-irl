# Knowledge Checks — Azure Kubernetes & Containers on Azure

> Self-assessment item bank covering AKS and containers across Azure. Items are tagged **L200** (foundational), **L300** (working professional), or **L400** (expert / design-level). Blend them freely.
>
> **How to use.** For each section, score yourself *Confident / Fuzzy / No idea*. Treat any "No idea" on an L200 as a study item before tackling the L300s. L400s are mastery probes — strong answers cite tradeoffs, failure modes, and concrete Azure controls.

---

## Section 1 — Container fundamentals on Azure

1. **(L200)** What is the difference between a container image and a running container, and which of the two does an Azure Container Registry (ACR) repository store?
2. **(L200)** Name the three main Azure compute services for running containers and the primary use case for each: ACR Tasks, Azure Container Instances (ACI), and Azure Kubernetes Service (AKS).
3. **(L200)** What does `docker build` produce that a registry like ACR can store, and what is the difference between a tag and a digest?
4. **(L300)** Why is multi-stage build in a Dockerfile considered a best practice for production images, and what concrete attack surface does it remove?
5. **(L300)** What is the OCI image specification, and why does AKS not care whether your image was built with Docker, BuildKit, Buildah, or Kaniko?
6. **(L300)** ACR offers Basic, Standard, and Premium tiers. Name three Premium-only capabilities relevant to enterprise workloads.
7. **(L400)** Compare ACR geo-replication with cross-region image import for a multi-region AKS deployment — which guarantees lower pull latency in a regional failover, and what is the tradeoff?
8. **(L400)** Argue for or against allowing mutable tags in a production ACR. What are the operational and security consequences of each posture?

---

## Section 2 — AKS cluster design (Day-0 decisions)

1. **(L200)** What is the difference between AKS Automatic and AKS Standard in terms of which knobs you own?
2. **(L200)** What does it mean for an AKS cluster's API server to be *private*, and what does that imply for `kubectl` from a workstation outside the VNet?
3. **(L300)** Compare kubenet, Azure CNI, Azure CNI Overlay, and Azure CNI Powered by Cilium. Which is reversible after the cluster exists?
4. **(L300)** Why is the choice between system-assigned and user-assigned managed identity for the AKS control plane considered effectively a Day-0 decision?
5. **(L300)** For a zone-redundant AKS cluster, what is the minimum number of Availability Zones required to survive a single-zone outage and still meet quorum-sensitive workloads like etcd-backed operators?
6. **(L400)** A team wants the API server reachable only from a corporate network *and* from GitHub-hosted CI runners. Compare API server VNet integration, authorized IP ranges, and a self-hosted runner inside the VNet. Which combination would you recommend and why?
7. **(L400)** You inherit a cluster with `enableRBAC = true` but `local accounts` still enabled and `aad` integration off. What is the threat model, and what is the migration sequence to Entra-integrated RBAC without an outage?
8. **(L400)** Design a node pool layout for a workload mix of (a) latency-sensitive serving pods, (b) batch jobs that tolerate eviction, and (c) a single-instance stateful operator. Justify SKU family, zones, taints, and spot vs. on-demand for each.

---

## Section 3 — Networking and ingress

1. **(L200)** What Kubernetes Service type provisions an Azure Load Balancer, and what does `externalTrafficPolicy: Local` change about source IP preservation?
2. **(L200)** What is the default idle timeout of an Azure Load Balancer, and why does it matter for long-lived TCP connections?
3. **(L300)** Compare Azure Application Gateway Ingress Controller (AGIC), the AKS managed NGINX ingress, and the Application Gateway for Containers (AGC). When would you pick each?
4. **(L300)** What is the role of Azure Front Door in front of an AKS cluster, and at how many layers can TLS terminate on the path Front Door → Ingress → Pod?
5. **(L300)** How does the Azure CNI Overlay data plane allocate Pod IPs, and why does this matter for VNet IP exhaustion in large clusters?
6. **(L400)** A workload uses long-lived sockets and you observe sessions dropping at exactly 30 minutes. Walk through the diagnosis from the client back to AKS, naming the three most likely culprits in priority order.
7. **(L400)** Compare the AKS Istio add-on, Cilium service mesh mode, and Open Service Mesh deprecation for a regulated workload that requires mTLS between services. What is the long-term recommendation today?
8. **(L400)** Design egress for a private AKS cluster that must reach Azure PaaS services, the public internet for package mirrors, and an on-prem REST API. Cover NAT Gateway, Azure Firewall, Private Endpoints, and user-defined routes.

---

## Section 4 — Identity, RBAC, and secrets

1. **(L200)** Name the two Kubernetes-level RBAC primitives (`Role`/`RoleBinding`, `ClusterRole`/`ClusterRoleBinding`) and the scope of each.
2. **(L200)** What does Azure RBAC for Kubernetes Authorization give you that Kubernetes RBAC alone does not?
3. **(L300)** Define AKS Workload Identity. How does it differ from the deprecated AAD Pod Identity, and why is it the recommended path today?
4. **(L300)** A pod uses Workload Identity to read a Key Vault secret. Trace the chain of trust: pod → AKS OIDC issuer → Entra → user-assigned managed identity → Key Vault. Where is each link verified?
5. **(L300)** What does a federated-credential subject look like for a Kubernetes ServiceAccount, and what symptom does a one-character typo produce at runtime?
6. **(L400)** Compare the AKS Secrets Store CSI Driver with the Key Vault provider against simply using Workload Identity + the Azure SDK in code. What are the tradeoffs in rotation, blast radius, and observability?
7. **(L400)** A team wants developers to have `kubectl exec` in dev but only `get/list` in prod, while CI has full write in both. Sketch the Azure RBAC + Kubernetes RBAC design.
8. **(L400)** Your organization disables local accounts on every AKS cluster (`local_account_disabled = true`). Which `az aks` command stops working, what replaces it, and how do you keep a break-glass account?

---

## Section 5 — GitOps and progressive delivery

1. **(L200)** Define GitOps in one sentence as it applies to Kubernetes.
2. **(L200)** What are the two AKS-native ways to install a GitOps controller (Argo CD or Flux) without doing it by hand?
3. **(L300)** Compare Argo CD and Flux on multi-tenancy, secret handling, and the App-of-Apps vs. Kustomization tree patterns.
4. **(L300)** What is the failure mode if a GitOps controller loses Git reachability for an hour — does the workload stop?
5. **(L300)** Why is "manual sync to production, auto-sync everywhere else" the most common posture in regulated environments?
6. **(L400)** Compare blue/green, canary, and progressive rollouts implemented with (a) raw Deployments, (b) Argo Rollouts, and (c) Flagger over a service mesh. Which gives you automated metric-based abort and how?
7. **(L400)** Design rollback for a GitOps stack: when does a UI-only rollback (Argo "rollback to revision N") drift from Git, and what is the right *post-incident* action?
8. **(L400)** A platform team wants a single Git repo to drive 30 clusters across 4 regions and 3 rings (dev/canary/prod). Sketch the directory layout, the App-of-Apps structure, and the protection model.

---

## Section 6 — Autoscaling and capacity

1. **(L200)** What is the difference between `resources.requests` and `resources.limits` on a container, and which one the scheduler reads?
2. **(L200)** What is the Horizontal Pod Autoscaler (HPA), and what is the default metric it scales on?
3. **(L300)** Define KEDA. Name three event sources KEDA can scale on that the stock HPA cannot.
4. **(L300)** Compare the AKS Cluster Autoscaler with Karpenter-style provisioners (Node Auto Provisioning preview). What does each optimize for?
5. **(L300)** What is `terminationGracePeriodSeconds`, how does it interact with `preStop` hooks, and why does it matter for autoscaling-driven pod churn?
6. **(L400)** A workload sees a burst from 0 → 5000 requests/sec in under 10 seconds. Walk through which signals KEDA reads, how the HPA reacts, when the Cluster Autoscaler kicks in, and where the latency cliff is.
7. **(L400)** Argue for or against running production pods on Azure Spot node pools. Which workload shapes are good candidates, which are not, and what failure-handling code do you need to write?
8. **(L400)** A team's CPU requests are all set to 1000m and they are paying for 3× the capacity they use. Design a right-sizing program that touches VPA, observability, and change management — without dropping long-lived TCP sessions during the rollout.

---

## Section 7 — Reliability, SLOs, and chaos

1. **(L200)** Define SLI, SLO, and SLA in one line each.
2. **(L200)** What does a `PodDisruptionBudget` (PDB) prevent, and what does it explicitly *not* prevent?
3. **(L300)** What is the difference between voluntary and involuntary disruption in Kubernetes? Give one example of each.
4. **(L300)** A node fails. Walk through the sequence of events: kubelet heartbeat → node controller → pod eviction → reschedule. What are the default timers?
5. **(L300)** What does Azure Chaos Studio give you on top of `kubectl drain` + manual cordon for AKS chaos engineering?
6. **(L400)** Your SLO is 99.9% availability over 30 days. The error budget burns 50% in the first week. What is the standard SRE response, and what changes if it burns 50% in the first day?
7. **(L400)** Compare zone-redundant single-region AKS, active-passive multi-region, and active-active multi-region for RTO, RPO, complexity, and cost. Where does each fit?
8. **(L400)** Design a chaos experiment plan for a stateful workload behind sockets: pod kill, node drain, zone failure, regional failover. What is the success criterion for each, and what would invalidate the experiment?

---

## Section 8 — Observability

1. **(L200)** What are the three Kubernetes probe types (`liveness`, `readiness`, `startup`) and what does each gate?
2. **(L200)** What does Container Insights collect from an AKS cluster, and where does it land?
3. **(L300)** Compare Azure Monitor managed Prometheus + managed Grafana with self-hosted Prometheus + Grafana on AKS. Which surfaces are managed vs. yours to keep up?
4. **(L300)** What is a recording rule vs. an alerting rule in Prometheus, and why do you want recording rules for SLO burn-rate alerts?
5. **(L300)** How does OpenTelemetry on AKS differ from Application Insights' classic SDK approach, and what is the recommended migration path today?
6. **(L400)** Design the three-pane war-room view for a production AKS incident: which metrics, which logs, which live commands. Justify each pane.
7. **(L400)** A pod is `Running` and `Ready` but the Argo Application is `Degraded`. What Kubernetes signals could be driving that, and which controller is making the call?
8. **(L400)** You need to correlate a customer-facing request with a specific pod restart 4 hours ago. Sketch the data model: trace IDs in logs, kubelet event retention, Azure Monitor query joining `KubePodInventory` with `ContainerLog`.

---

## Section 9 — Security and supply chain

1. **(L200)** What does an `ImagePullSecret` do, and why does an AKS-managed kubelet usually not need one for ACR?
2. **(L200)** Name three Kubernetes resources that, by default, can be created cluster-wide without a namespace.
3. **(L300)** Define Pod Security Admission (PSA). Compare the `restricted`, `baseline`, and `privileged` profiles.
4. **(L300)** What is Microsoft Defender for Containers, and which of these does it cover: image scanning in ACR, runtime threat detection in AKS, Kubernetes API audit anomaly detection?
5. **(L300)** What is the difference between an admission controller, a validating webhook, and a mutating webhook? Give a real example of each in an AKS context.
6. **(L400)** Design an image promotion pipeline that signs images at build with Notation, attaches an SBOM, scans for CVEs, and refuses to deploy unsigned or vulnerable images at the cluster. Name the Azure-native components at each step.
7. **(L400)** Compare network policy enforcement options on AKS: Azure Network Policy, Calico, and Cilium. Which would you pick for a workload that needs L7 (HTTP/gRPC) policy, and what is the cost?
8. **(L400)** A pod is compromised. Walk through containment: how do you isolate it without losing forensics, what audit trails exist in AKS by default, and what does Defender for Containers add?

---

## Section 10 — Cost and FinOps

1. **(L200)** What are the three Azure-side cost components of an AKS cluster (control plane, nodes, supporting infra), and which one is free on the Free tier?
2. **(L200)** Why do over-set CPU requests cost more than over-set CPU limits in a typical AKS workload?
3. **(L300)** Compare Reserved Instances, Savings Plans, and Spot for AKS node pools. Which combine and which do not?
4. **(L300)** What is the AKS cost analysis add-on, and what dimensions of cost (namespace, label, workload) does it surface?
5. **(L300)** A workload uses 5% of allocated CPU and 90% of allocated memory. What is the right Azure VM SKU family to consider, and why?
6. **(L400)** Build the business case for moving 30% of a batch workload to spot pools. What data do you need from observability, what code changes do you need to handle eviction, and what is the realistic ballpark saving?
7. **(L400)** A platform team wants per-team chargeback on a shared AKS cluster. Compare label-based showback via the cost add-on, dedicated node pools per team, and dedicated namespaces with resource quotas. What is the operational cost of each?
8. **(L400)** Argue for or against scale-to-zero for a low-traffic internal API on AKS. Cover KEDA, cold-start, the cost of the underlying node pool, and the alternative of Azure Container Apps.

---

## Section 11 — Storage and stateful workloads

1. **(L200)** What is the difference between a `PersistentVolume` and a `PersistentVolumeClaim` in Kubernetes?
2. **(L200)** Name three Azure-native CSI drivers available on AKS and the storage backend each maps to.
3. **(L300)** Compare Azure Disk CSI (`disk.csi.azure.com`) with Azure Files CSI (`file.csi.azure.com`) on access modes (`RWO` vs. `RWX`), performance, and failure domain.
4. **(L300)** What is a `StatefulSet`, and what does it guarantee about pod identity and storage that a `Deployment` does not?
5. **(L300)** Why is Azure Disk a poor fit for a workload that needs to fail a pod over to a node in a different Availability Zone, and what are the two ways to solve it?
6. **(L400)** Design storage for a database workload that needs (a) durable per-pod storage, (b) snapshotting for backup, and (c) survives single-zone failure. Compare Azure Disk ZRS, Azure NetApp Files, and the Premium SSD v2 + manual replication options.
7. **(L400)** A `StatefulSet` is stuck because a `PersistentVolumeClaim` cannot bind in a new zone after a node failure. Walk through the diagnosis and the recovery steps.
8. **(L400)** Argue for or against running a production OLTP database on AKS vs. on Azure Database for PostgreSQL Flexible Server. Cover operational burden, performance tuning, HA, and patch cadence.

---

## Section 12 — Disaster recovery and multi-region

1. **(L200)** Define RTO and RPO in one sentence each.
2. **(L200)** What is the difference between a backup and a snapshot, and which one is sufficient for accidental-delete recovery vs. region-loss recovery?
3. **(L300)** Compare DNS-based failover (Azure Front Door, Traffic Manager) with anycast IPs (Cross-Region Load Balancer) for AKS regional failover. What bounds RTO in each?
4. **(L300)** What is the difference between geo-redundant storage (GRS) and zone-redundant storage (ZRS) for AKS-attached disks and backups?
5. **(L300)** How does Velero (or Kasten K10) on AKS interact with the Azure CSI snapshotter, and why is application-consistent backup harder than crash-consistent?
6. **(L400)** Design failover for a workload composed of stateless AKS pods, an Azure Database for PostgreSQL Flexible Server, and an Azure Cache for Redis. Specify the steps in order and call out what is not reversible.
7. **(L400)** Your RTO budget is 5 minutes for region failover, but you observe P99 latency stays elevated for 15 minutes after recovery. Where does the gap come from and how do you close it?
8. **(L400)** Argue for or against active-active across two Azure regions for a workload that does not require it for SLO. What new failure modes do you introduce?

---

## Section 13 — Day-2 operations

1. **(L200)** What does a Kubernetes minor version upgrade on AKS upgrade, and what does it *not* touch?
2. **(L200)** What is the supported version skew between `kubectl` client and the AKS API server?
3. **(L300)** Compare auto-upgrade channels for AKS (`none`, `patch`, `stable`, `rapid`, `node-image`). Which is appropriate for production, and what guardrails do you want around it?
4. **(L300)** What is the AKS *maintenance window* feature, and what is the typical pattern for combining it with auto-upgrade channels?
5. **(L300)** How do node-image upgrades differ from control-plane upgrades, and which one drains nodes?
6. **(L400)** Design a cluster upgrade runbook that covers PDB review, surge nodes, blast-radius testing, and rollback. What is your stop-the-line criterion?
7. **(L400)** A `kubectl drain` is stuck because a pod has a misconfigured PDB. Walk through the safe recovery options, ordered from least to most disruptive.
8. **(L400)** Two teams share a cluster. One team's image-pull surge is starving the other team's pods of node bandwidth. Cover the technical fixes (registry caching, pre-pull DaemonSet, network policy) and the organizational fix (separate node pools, quotas, policy).

---

## Section 14 — Containers beyond AKS

1. **(L200)** What is Azure Container Apps (ACA), and how is it different from AKS at the user-facing level?
2. **(L200)** What is Azure Container Instances (ACI), and what is the canonical use case (one-shot jobs, dev/test, burst, GitHub Actions runners)?
3. **(L300)** Compare ACA and AKS on: scale-to-zero, custom CRDs, sidecar control, networking integration with private VNets, and operational burden.
4. **(L300)** What is the AKS virtual nodes add-on (ACI-backed), and what production limitations does it carry?
5. **(L300)** When does Azure App Service for Containers beat both ACA and AKS for a single-image web workload?
6. **(L400)** Design a decision tree: for a new internal API, when should you pick App Service for Containers vs. ACA vs. AKS vs. ACI? Justify with concrete signals (team size, scale, customization, multi-tenancy).
7. **(L400)** Compare the security model: ACA uses managed identities and Dapr, AKS uses Workload Identity and a service mesh. For a workload that calls 10 Azure services and 3 internal services, which gives you less code to write and why?
8. **(L400)** A team built an MVP on ACA and now wants to move to AKS for sidecar control. Sketch the migration: image, manifests, ingress, identity, secrets. Where are the gotchas?

---

## How to grade yourself

For each section:

- **All L200 confident, most L300 confident** → you operate AKS / containers on Azure day-to-day.
- **L200 + L300 confident, some L400 confident** → you design and review for the org.
- **L400 confident across most sections** → you set the architecture direction.

A "Fuzzy" on an L200 is a higher-priority gap than a "No idea" on an L400. Close foundations first.
