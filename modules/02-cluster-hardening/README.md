# Module 02 — Cluster Hardening & Access

**Duration:** 60 min  |  **Level target:** L300, with L400 stretch  |  **Day:** 1

## Outcomes
- Configure Workload Identity for the app's KV access
- Mount a secret from Key Vault via CSI Secrets Store
- Set Azure RBAC roles (no static kubeconfigs)
- Enable Azure Policy + Deployment Safeguards baseline
- Verify Istio mesh injection on the `app` namespace

## Whiteboard prompts (5 min)
1. Where would a pod's identity be cached, and what is its TTL?
2. Why does Workload Identity beat AAD Pod Identity (deprecated) — and what was AAD Pod Identity's failure mode?
3. If your namespace has `istio.io/rev: asm-1-23`, what happens to pods created before that label was set?

## Step 1 — Workload Identity for the app
The Terraform created an empty UAMI for the cluster. For the **app**, you create a UAMI per workload + a federated credential against the cluster's OIDC issuer.

```bash
RG=$(terraform output -raw primary_resource_group)
AKS=$(terraform output -raw aks_primary_name)
SUB=$(az account show --query id -o tsv)
ISSUER=$(az aks show -g $RG -n $AKS --query oidcIssuerProfile.issuerUrl -o tsv)

# UAMI for the api-node workload
az identity create -g $RG -n sita-storefront-api-mi
UAMI_CLIENT=$(az identity show -g $RG -n sita-storefront-api-mi --query clientId -o tsv)
UAMI_OID=$(az identity show -g $RG -n sita-storefront-api-mi --query principalId -o tsv)

# Federate to the ServiceAccount that the api-node pods will use
az identity federated-credential create \
  --identity-name sita-storefront-api-mi \
  -g $RG -n api-node-fed \
  --issuer $ISSUER \
  --subject "system:serviceaccount:app:api-node" \
  --audience api://AzureADTokenExchange
```

Grant the UAMI reader on Key Vault secrets (Module 03 will store the demo secret):
```bash
KV_ID=$(terraform output -raw key_vault_primary_uri | sed 's|https://||; s|.vault.azure.net.*||')
az role assignment create --role "Key Vault Secrets User" \
  --assignee-object-id $UAMI_OID --assignee-principal-type ServicePrincipal \
  --scope $(az keyvault show -n $KV_ID --query id -o tsv)
```

## Step 2 — Install the CSI Secrets Store provider
The managed addon is enabled via:
```bash
az aks enable-addons -g $RG -n $AKS --addons azure-keyvault-secrets-provider
```
Wait for the `csi-secrets-store-*` DaemonSet in `kube-system`.

## Step 3 — Cluster RBAC bindings
Grant your participants the **Azure Kubernetes Service RBAC Reader** role for read-only operations and **Cluster User** to fetch credentials:
```bash
ME=$(az ad signed-in-user show --query id -o tsv)
CLUSTER_ID=$(az aks show -g $RG -n $AKS --query id -o tsv)
az role assignment create --role "Azure Kubernetes Service Cluster User Role" --assignee-object-id $ME --scope $CLUSTER_ID
az role assignment create --role "Azure Kubernetes Service RBAC Cluster Admin" --assignee-object-id $ME --scope $CLUSTER_ID
```

> **[F]** This is intentionally heavy-handed for the workshop. In Module 05 we tighten it: rings get scoped to namespaces, not cluster admin.

## Step 4 — Verify Istio mesh injection
```bash
az aks command invoke -g $RG -n $AKS --command "kubectl get pods -n aks-istio-system"
```
You should see `istiod-asm-1-23-*` and `aks-istio-ingressgateway-external-*`. Note the external ingress gateway's public IP — that's what Front Door points at.

## Step 5 — Apply a baseline Azure Policy assignment
Use the **AKS baseline initiative**:
```bash
SCOPE=$(az aks show -g $RG -n $AKS --query id -o tsv)
az policy assignment create \
  --name aks-baseline-${POD:-01} \
  --display-name "AKS baseline policies" \
  --scope $SCOPE \
  --policy-set-definition "/providers/Microsoft.Authorization/policySetDefinitions/a8640138-9b0a-4a28-b8cb-1666c838647d"
```

## Validation
- `kubectl get sa api-node -n app` shows the SA annotated with the UAMI client ID (we'll create this in Module 03)
- Policy compliance pane in Azure Portal shows a baseline initiative assigned to your cluster
- The ingress gateway has an external IP

## Stretch (L400)
- Disable public NIC on the ingress gateway and put Front Door **Private Link** in front instead.
- Turn on **Deployment Safeguards** in `Warn` mode and review the violations the v1 app produces.
- Move Key Vault to **private endpoint only** and observe how CSI still works (resolves via the spoke's DNS).

## Cleanup
None — these are baseline configurations the rest of the workshop relies on.
