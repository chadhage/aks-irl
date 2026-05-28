# Prerequisites — WorkshopPlus participants

> Complete every item below **before Day 1**. Allow ~60 minutes for the first pass. If a check fails, raise it with the trainer on the workshop chat at least 24 h before kick-off — some of these (quota, feature flags) can take hours to resolve.

## 1. Local tools (your laptop)

Install these and confirm the versions:

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
| `ncat` / `openssl s_client` | latest | `ncat --version` — used for socket smoke-tests |

Optional but useful: `k9s`, `stern`, `argocd` CLI, `istioctl`, `psql` (Postgres client).

## 2. Azure — your own lab subscription

- One Azure subscription you can use for this workshop (MCAPS, MPN sandbox, Visual Studio benefit, or any pay-as-you-go you control)
- You are **Owner** on the subscription (or at least on the resource group where everything will live)
- `az login` succeeds and `az account show` returns the right subscription

> The workshop provisions Azure Front Door (global) + dual-region AKS + dual Key Vaults + Azure DB for PostgreSQL Flexible Server (HA) + ACR + observability. Plan for **~$35–$55/day** while everything is running. Modules include scale-to-zero / stop instructions so you can pause overnight.

### Quotas to verify

In your subscription, confirm headroom in both regions:

| Resource | Quantity | Region |
|---|---|---|
| vCPU (Standard_D-series v5) | 32 | eastus2 |
| vCPU (Standard_D-series v5) | 16 | westus3 |
| Public IP (Standard) | 6 | eastus2 + westus3 (NLB for TCP + Front Door origin + Bastion) |
| Front Door Standard profile | 1 | global |
| Log Analytics workspace | 1 | eastus2 |
| Azure Managed Grafana | 1 | eastus2 |
| Key Vault | 2 | eastus2 + westus3 |
| ACR (Premium, zone-redundant) | 1 | eastus2 (geo-replicated to westus3) |
| Azure Database for PostgreSQL Flexible Server | 2 (primary + replica) | eastus2 + westus3 |

Total **≈ 48 vCPU**. Order **≥ 60 vCPU** in each region so autoscale during chaos labs has headroom.

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
az provider register --namespace Microsoft.DBforPostgreSQL
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
git clone https://github.com/<your-user>/aks-briefing-with-labs.git
cd aks-briefing-with-labs
```

## 4. Connectivity

- Outbound TCP 443 to `*.azure.com`, `ghcr.io`, `mcr.microsoft.com`, `github.com`
- Outbound TCP 4561 / 4562 to your own NLB public IP (used by the socket smoke-test from your laptop)
- Azure Bastion is used to reach the private-API AKS Cluster (no public `kubectl` endpoint)

## 5. Pre-flight script

From the repo root:
```bash
./scripts/preflight.sh
```
It prints a pass/fail line per check. Resolve any red lines before Day 1.

## 6. Read before Day 1

- [SCENARIO.md](SCENARIO.md) — the Skybridge Messaging brief
- [README.md](README.md#terminology--read-this-first) — terminology section (Kubernetes words vs the app's Java/C++ names)
- The Day-0 decision table in [modules/00-envisioning/README.md](modules/00-envisioning/README.md)

The trainer will assume you have done these. We will *not* spend the first hour reading the brief together.

---

## Naming convention

`{program}-{lab}-{purpose}-{region}-{instance}`

- `program` = `sita`
- `lab` = `l01` (the lab identifier — defaults to `01`; you only need one)
- `purpose` = `aks`, `kv`, `acr`, `rg`, `vnet`, `pg`, `nlb`, …
- `region` = `eus2`, `wus3`
- `instance` = 4-char random suffix from Terraform `random_string`

Examples:
- Primary resource group: `sita-l01-rg-eus2-a1b2`
- AKS Cluster: `sita-l01-aks-eus2-a1b2`
- Postgres Flexible Server: `sita-l01-pg-eus2-a1b2`
- Messaging NLB IP: `sita-l01-nlb-eus2-a1b2`
- ACR: `sital01acreus2a1b2` (no dashes — ACR limitation)

## Cost guardrails

- **Stop when you walk away.** Each module ends with an optional "scale-to-zero" snippet. Use it.
- **Postgres Flexible Server cannot scale to zero** — it costs ~$8/day idle. Either delete it overnight or accept the cost.
- **Final cleanup** is `terraform destroy` in `infra/terraform/envs/lab` (covered at the end of [LAB-GUIDE.md](LAB-GUIDE.md)).
- Set a **subscription budget alert** at ~$80/day to catch surprises.
