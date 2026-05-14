# Terraform — Enterprise-Scale AKS infrastructure

This Terraform deploys the **entire workshop platform** described in [the top-level README](../../README.md):

- Hub VNet (Firewall, Bastion)
- Two spoke VNets (eastus2 primary, westus3 passive) peered to the hub
- Two AKS Standard clusters — private API server, Azure CNI Overlay powered by Cilium, 3 availability zones
- ACR Premium (zone-redundant, geo-replicated)
- Two Key Vaults (regional)
- Observability: Log Analytics, Azure Managed Prometheus, Azure Managed Grafana
- Azure Front Door Standard + WAF in front of both clusters
- Workload Identity federation (one identity per workload namespace)
- Azure Chaos Studio targets enabled on both clusters

## Layout

```
infra/terraform/
├── bootstrap/             # one-shot: creates remote-state SA + GH OIDC SP
├── envs/
│   ├── squad-template/      # copy → squad-XX/ for each participant squad
│   └── squad-01/            # example, committed for reference
├── modules/
│   ├── naming/
│   ├── network-hub/
│   ├── network-spoke/
│   ├── aks/
│   ├── acr/
│   ├── keyvault/
│   ├── observability/
│   └── front-door/
└── bootstrap.sh           # convenience wrapper
```

## Usage

```bash
# 1. Bootstrap remote state (once per subscription)
cd infra/terraform/bootstrap
terraform init && terraform apply

# 2. Copy the template for your squad
cd ../envs
cp -r squad-template squad-$SQUAD
cd squad-$SQUAD

# 3. Fill in terraform.tfvars (subscription_id, squad_id, github_repo)
$EDITOR terraform.tfvars

# 4. Deploy
terraform init -backend-config=../../bootstrap/backend.hcl
terraform plan -out tfplan
terraform apply tfplan
```

Each `terraform apply` for a fresh squad takes ~25 minutes (Front Door + dual AKS dominate).

## Module conventions

- All modules accept a `naming` object built by `modules/naming` so resource names are consistent.
- All clusters are created with `oidc_issuer_enabled = true` and `workload_identity_enabled = true`.
- AKS node pools are sized for sandbox quotas: 1 system pool (3× D4s_v5, zones 1-2-3), 1 user pool (2× D4s_v5, zones 1-2-3, autoscaler 1-5).
- Spot pool is **defined but scaled to 0** by default — Module 08 turns it on.

## What is intentionally NOT in Terraform

Following GitOps discipline, these are managed by **Argo CD** from `gitops/` and **not** by Terraform:

- Application namespaces and workloads
- Istio `Gateway`, `VirtualService`, `DestinationRule` for app traffic
- KEDA ScaledObjects
- PodDisruptionBudgets and HorizontalPodAutoscalers for apps

Terraform owns the **platform**; GitOps owns the **applications**. This split is a teaching moment in [Module 03](../../modules/03-mvp-go-live/README.md).
