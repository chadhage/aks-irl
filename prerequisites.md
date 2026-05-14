# Prerequisites

> Complete every item below before you start [Module 00](modules/00-envisioning/README.md). Allow ~30 minutes the first time.

## 1. Local tools (one desktop)

Install these and confirm versions:

| Tool | Min version | Check |
|---|---|---|
| Azure CLI | 2.65 | `az version` |
| Terraform | 1.9 | `terraform version` |
| kubectl | 1.30 | `kubectl version --client` |
| kubelogin | latest | `kubelogin --version` |
| helm | 3.15 | `helm version` |
| docker / podman | latest | `docker version` |
| git | 2.40 | `git --version` |
| jq, yq | latest | `jq --version`, `yq --version` |
| GitHub CLI | 2.50 | `gh --version` |

Optional but useful: `k9s`, `stern`, `argocd` CLI, `istioctl`, `hey` (load test).

## 2. Azure — one learning subscription

- One Azure subscription you can use for this lab (MCAPS, MPN sandbox, Visual Studio benefit, or any pay-as-you-go you control)
- You are **Owner** on the subscription (or at least on the resource group where everything will live)
- `az login` succeeds and `az account show` returns the right subscription

> The lab provisions Azure Front Door (global) + dual-region AKS + dual Key Vaults + ACR + observability. Plan for **~$25–$40/day** while everything is running. Modules include scale-to-zero / stop instructions so you can pause overnight.

### Quotas to verify

In your subscription, confirm you have headroom in both regions:

| Resource | Quantity | Region |
|---|---|---|
| vCPU (Standard_D-series v5) | 24 | eastus2 |
| vCPU (Standard_D-series v5) | 16 | westus3 |
| Public IP (Standard) | 4 | eastus2 + westus3 |
| Front Door Standard profile | 1 | global |
| Log Analytics workspace | 1 | eastus2 |
| Azure Managed Grafana | 1 | eastus2 |
| Key Vault | 2 | eastus2 + westus3 |
| ACR (Premium, zone-redundant) | 1 | eastus2 (geo-replicated to westus3) |

Total **≈ 40 vCPU**. Order **≥ 50 vCPU** in each region so autoscale during chaos labs has headroom.

Check quotas:
```bash
az vm list-usage --location eastus2 -o table | findstr -i "vcpus dsv5"
az vm list-usage --location westus3 -o table | findstr -i "vcpus dsv5"
```

### Feature flags / preview registrations

Run once per subscription:
```bash
az feature register --namespace Microsoft.ContainerService --name EnableIstioMeshPreview
az feature register --namespace Microsoft.ContainerService --name AzureServiceMeshPreview
az feature register --namespace Microsoft.ContainerService --name NodeAutoProvisioningPreview
az provider register --namespace Microsoft.ContainerService
az provider register --namespace Microsoft.Insights
az provider register --namespace Microsoft.AlertsManagement
az provider register --namespace Microsoft.Dashboard
az provider register --namespace Microsoft.Monitor
az provider register --namespace Microsoft.Chaos
az provider register --namespace Microsoft.Cdn
```

## 3. GitHub

- Personal account that can host a private fork of this repo
- A fine-grained Personal Access Token scoped to your fork with `repo` and `workflow` scopes — Argo CD will use it to read the GitOps repo

Fork the repo in the GitHub UI, then clone your fork locally:
```bash
git clone https://github.com/<your-user>/aks-irl.git
cd aks-irl
```

## 4. Connectivity

- Outbound TCP 443 to `*.azure.com`, `ghcr.io`, `mcr.microsoft.com`, `github.com`
- Azure Bastion is used to reach the private-API AKS Cluster (no public `kubectl` endpoint)

## 5. Pre-flight script

From the repo root:
```bash
./scripts/preflight.sh
```
It prints a pass/fail line per check. Resolve any red lines before starting Module 00.

## Naming convention

`{program}-{lab}-{purpose}-{region}-{instance}`

- `program` = `sita`
- `lab` = `l01` (the lab identifier — defaults to `01`; you only need one)
- `purpose` = `aks`, `kv`, `acr`, `rg`, `vnet`, …
- `region` = `eus2`, `wus3`
- `instance` = 3-char random suffix from Terraform `random_string`

Examples:
- Primary resource group: `sita-l01-rg-eus2-a1b`
- AKS Cluster: `sita-l01-aks-eus2-a1b`
- ACR: `sital01acreus2a1b` (no dashes — ACR limitation)

## Cost guardrails

- **Stop when you walk away.** Each module ends with an optional "scale-to-zero" snippet. Use it.
- **Final cleanup** is `terraform destroy` in `infra/terraform/envs/lab` (covered at the end of [LAB-GUIDE.md](LAB-GUIDE.md)).
- Set a **subscription budget alert** at ~$50/day to catch surprises.
