# Module 01 — Platform Foundation (Terraform)

**Duration:** 90 min  |  **Level target:** L300  |  **Day:** 1

## Outcomes
- Bootstrap remote Terraform state in Azure Storage
- Federate GitHub Actions to Azure via OIDC (no secrets in CI)
- Apply the full platform: hub-spoke VNets, 2× AKS (private), ACR, KV, observability, Front Door
- Connect to the private cluster from your workstation

## Whiteboard prompts (5 min)
1. Why is the cluster API server private here, and what does that cost us in dev ergonomics?
2. If `terraform apply` fails halfway through, what's the *minimum* you re-run? What's the *safe* thing to re-run?
3. Who owns the AKS-managed `MC_*` resource group? Can you delete things in it?

## Step 1 — Bootstrap (one-time per subscription, facilitator)
```bash
cd infra/terraform/bootstrap
terraform init
terraform apply -var subscription_id=$ARM_SUBSCRIPTION_ID
```
This produces `backend.hcl`. Commit it (it's just storage account refs, no secrets).

## Step 2 — Wire GitHub OIDC (per squad)
Create an Entra app and federated credential so `terraform apply` from GitHub Actions can assume an Azure identity **without storing a client secret**:

```bash
SQUAD=01
REPO=your-org/aks-briefing-with-labs
SUB=$(az account show --query id -o tsv)
TENANT=$(az account show --query tenantId -o tsv)

# 1. App registration + SP
APP_ID=$(az ad app create --display-name "sita-squad${SQUAD}-tf" --query appId -o tsv)
az ad sp create --id $APP_ID
SP_OID=$(az ad sp show --id $APP_ID --query id -o tsv)

# 2. Contributor on the subscription (sandbox-only scope — in real life, scope tighter)
az role assignment create --assignee $APP_ID --role Contributor --scope /subscriptions/$SUB
az role assignment create --assignee $APP_ID --role "User Access Administrator" --scope /subscriptions/$SUB

# 3. Federated credential
az ad app federated-credential create --id $APP_ID --parameters @- <<EOF
{ "name": "github-main", "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:${REPO}:ref:refs/heads/main", "audiences": ["api://AzureADTokenExchange"] }
EOF
```

Add these to GitHub repo secrets (Settings → Secrets and variables → Actions):
- `AZURE_CLIENT_ID=$APP_ID`
- `AZURE_TENANT_ID=$TENANT`
- `AZURE_SUBSCRIPTION_ID=$SUB`

## Step 3 — Plan & apply your squad
```bash
SQUAD=01
cd infra/terraform/envs
cp -r squad-template squad-$SQUAD
cd squad-$SQUAD
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: squad_id, subscription_id, github_repo, admin_object_ids

terraform init \
  -backend-config=../../bootstrap/backend.hcl \
  -backend-config="key=squad-$SQUAD.tfstate"

terraform plan -out tfplan
terraform apply tfplan
```
~25 min. Use the time to read [Module 02](../02-cluster-hardening/README.md).

## Step 4 — Connect to the private cluster

Because the API server is private, you cannot `kubectl` directly from your laptop. Options:
- **Bastion + jumpbox** (recommended for L400): deploy a small VM in the hub VNet.
- **Cloud Shell**: works because Cloud Shell can reach Azure private endpoints via the resource's VNet integration once you enable `--vnet-integration`.
- **Az CLI command run**: shells `kubectl` into the cluster from inside the control plane. Convenient for spot checks.

```bash
# Shortest path: az aks command invoke
RG=$(terraform output -raw primary_resource_group)
AKS=$(terraform output -raw aks_primary_name)
az aks command invoke -g $RG -n $AKS --command "kubectl get nodes -o wide"
```

For interactive work, run a Bastion-fronted jumpbox or use the [AKS connector script](../../scripts/connect-private-aks.sh) (creates a temp VM in the hub).

## Validation
- `terraform output` prints both cluster names and ACR login server.
- `az aks command invoke ... 'kubectl get nodes'` shows 3 system nodes in eastus2, 3 in westus3, all `Ready`, spread across zones 1/2/3.
- Azure Managed Grafana endpoint loads and shows the **AKS / Kubernetes / Cluster** dashboard with data.

## Stretch (L400)
- Tighten the OIDC subject to `repo:org/repo:environment:prod` — what changes for the deploy ring lab?
- Enable Defender for Containers cluster sensor; review the first detections after Module 03.
- Replace the public Front Door endpoint with **Private Link** to ACA's private origin.

## Cleanup (only at end of workshop)
```bash
terraform destroy
```
