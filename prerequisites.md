# Prerequisites

> Complete every item in **Pre-flight** before Day 1 morning. The **Sandbox quotas** section is for the facilitator.

## Pre-flight (every participant)

### 1. Local tools
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

Optional but useful: `k9s`, `stern`, `argocd` CLI, `istioctl`.

### 2. Azure
- Reader access to the workshop subscription (facilitator will share name)
- `az login` succeeds
- Your assigned **resource-group prefix** (`sita-<initials>-…`) communicated by the facilitator
- Microsoft Entra tenant ID handy

### 3. GitHub
- Personal account that can create a private fork of this repo
- A Personal Access Token (fine-grained, scoped to your fork) with `repo` and `workflow` scopes — needed for Argo CD to read the GitOps repo

### 4. Connectivity
- Outbound TCP 443 to `*.azure.com`, `ghcr.io`, `mcr.microsoft.com`, `github.com`
- Bastion will be used to reach private-API AKS; **no public kubectl endpoint**

### 5. Pre-flight script
From the repo root:
```bash
./scripts/preflight.sh
```
It prints a pass/fail line per check. Don't show up Day 1 with red lines.

## Sandbox quotas (facilitator-only)

Per participant pod (2-3 people), reserve:

| Resource | Quantity | Region |
|---|---|---|
| vCPU (Standard_D-series v5) | 24 | eastus2 |
| vCPU (Standard_D-series v5) | 16 | westus3 |
| Public IP (Standard) | 4 | eastus2 + westus3 |
| Front Door Standard profile | 1 | global |
| Log Analytics workspaces | 1 | eastus2 |
| Azure Managed Grafana | 1 | eastus2 |
| Key Vault | 2 | eastus2 + westus3 |
| ACR (Premium, zone-redundant) | 1 | eastus2 (geo-replicated to westus3) |

**Total per pod ≈ 40 vCPU**. Order the subscription with **≥ 50 vCPU** in each region to leave headroom for autoscale during chaos labs.

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

### Service principal / OIDC for GitHub Actions
The facilitator provisions one **per pod** using `infra/terraform/bootstrap/`. See [modules/01-platform-foundation/README.md](modules/01-platform-foundation/README.md).

## Naming convention

`{program}-{pod}-{purpose}-{region}-{instance}`

- `program` = `sita`
- `pod` = `p01`, `p02`, …
- `purpose` = `aks`, `kv`, `acr`, `rg`, `vnet`, …
- `region` = `eus2`, `wus3`
- `instance` = 3-char random suffix from Terraform `random_string`

Examples:
- Primary resource group: `sita-p01-rg-eus2-a1b`
- AKS cluster: `sita-p01-aks-eus2-a1b`
- ACR: `sitap01acreus2a1b` (no dashes — ACR limitation)

## Cost guardrails

The full stack costs roughly **\$25–\$40 per pod per day** if left running. Modules include **stop / scale-to-zero** instructions for breaks. Final cleanup is `terraform destroy` at the end of Day 2.
