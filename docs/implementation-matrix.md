# Implementation Traceability Matrix

This matrix is the release contract for the workshop. A claim is complete only
when its implementation and automated validation both exist. Evidence from a
clean-subscription rehearsal is recorded under `evidence/<date>/<module>/`.

## Recommendation delivery

| ID | Outcome | Owning artifacts | Automated validation | Rehearsal evidence | Status |
| --- | --- | --- | --- | --- | --- |
| R1 | Terraform validates and provisions every Module 01 resource | `infra/terraform/` | `terraform fmt -check -recursive`, `terraform init -backend=false`, `terraform validate`, clean-subscription plan/apply | M01 plan, apply output, resource inventory, destroy output | In progress |
| R2 | Gateway journals acknowledged messages to PostgreSQL and supports regional database failover | `apps/gateway-java/`, `infra/terraform/modules/postgresql/`, `k8s/base/` | Java unit and PostgreSQL integration tests; failover invariant tests | M03 journal query; M07 RTO/RPO and single-writer evidence | Not started |
| R3 | Load generator continuously sends, reconnects, re-resolves DNS, and reports RTO/RPO | `tools/load-generator/`, `scripts/smoke.sh` | Unit tests plus local gateway disruption test | M03 baseline, M06 disruption report, M07 regional report | Implemented; disruption test pending |
| R4 | A/B validation and metrics report the parser version that handled each message | Gateway/parser code, dashboard, load generator | Deterministic cohort test and bounded weighted-distribution test | M04 client report and Grafana capture | Parser propagation implemented; dashboard pending |
| R5 | Gateway drains without accepting new sockets during termination | Gateway code and `k8s/base/gateway-java.yaml` | Drain integration test under continuous load | M05 rollout and M06 node-drain report | Implemented; integration test pending |
| R6 | CI validates Terraform, manifests, apps, scripts, workflows, images, and docs | `.github/workflows/` | Required branch checks | Successful run linked from rehearsal manifest | Implemented; hosted run pending |
| R7 | A clean participant environment completes every documented validation | `evidence/`, module guides | Evidence manifest checker | Two complete rehearsals, including one non-author run | Evidence contract implemented; rehearsals pending |

## Module 01 resource contract

| Claimed resource or capability | Terraform owner | Required acceptance check | Status |
| --- | --- | --- | --- |
| Hub VNet and two peered regional spokes | `network-hub`, `network-spoke` | Peerings are connected and address spaces do not overlap | Implemented, not rehearsed |
| Azure Firewall and controlled spoke egress | `network-hub` | Firewall is provisioned; route tables send required egress through it | Missing |
| Azure Bastion access path | `network-hub` | Bastion is provisioned and private AKS access procedure succeeds | Missing |
| Two private AKS Standard clusters | `aks` | Private API, Entra RBAC, local accounts disabled, OIDC and Workload Identity enabled | Implemented, validation in progress |
| Azure CNI Overlay with Cilium | `aks` | Provider validation passes and deployed network profile reports overlay/Cilium | Validation in progress |
| Three-zone system and user pools | `aks` | nodes span zones 1, 2, and 3; system taint is present | Implemented, not rehearsed |
| ACR Premium with geo-replication | `acr` | replica is ready and both kubelet identities have `AcrPull` | Implemented, not rehearsed |
| Two regional Key Vaults | `keyvault` | RBAC mode and private-network posture match the workshop decision | Partial |
| Log Analytics and AKS control-plane diagnostics | `observability`, `aks` | required diagnostic categories arrive in Log Analytics | Partial |
| Managed Prometheus collection | `observability`, `aks` | gateway and parser targets are up and queryable | Partial |
| Managed Grafana integration and access | `observability` | Grafana identity can query the Monitor workspace | Implemented, not rehearsed |
| PostgreSQL primary with zone-redundant HA | `postgresql` | server is private, HA is enabled, schema migration succeeds | Implemented, not rehearsed |
| PostgreSQL cross-region replica | `postgresql` | replica is healthy and lag is measurable | Implemented, not rehearsed |
| Stable private database DNS contract | `postgresql`, `network-spoke` | gateway resolves the active database endpoint in both regions | Missing |
| Regional TCP load balancers | GitOps `Service` resources | each regional service obtains a stable public IP | Partial |
| Front Door with valid regional origins | `front-door` plus regional ingress outputs | both origins pass health probes | Implemented, not rehearsed |
| Front Door WAF policy | `front-door` | route is associated with an enabled WAF policy | Implemented, not rehearsed |
| GitHub Actions OIDC identity | `bootstrap` | workflow obtains an Azure token without a client secret | Partial |
| Gateway Workload Identity | Terraform and `gateway-java` ServiceAccount | Pod obtains tokens and connects to Key Vault/PostgreSQL without secrets | Terraform implemented; database grant pending |

## Release gates

1. No `REPLACE` or `.placeholder` value may reach a rendered production artifact.
2. Every command presented as participant validation must run in CI or produce
   a machine-readable evidence file during rehearsal.
3. Documentation must not mark an outcome complete before its acceptance check
   passes in a clean subscription.
4. The workshop release tag requires successful apply, Modules 00-08, and
   destroy rehearsals with no unexplained manual intervention.
