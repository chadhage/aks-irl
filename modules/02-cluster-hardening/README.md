# Module 02 — Cluster Hardening & Identity

**Time:** ~45 min  |  **Level target:** L300

## 1. Outcomes

You can:

- Reach the **private** AKS API server (no kubeconfig) and validate node + Istio readiness
- Create a **User-Assigned Managed Identity (UAMI)** per workload and federate it to the in-cluster ServiceAccount
- Grant the gateway UAMI **Key Vault Secrets User** + **Azure Database for PostgreSQL — Entra connect** with no shared passwords
- Confirm Istio mesh and CSI Secrets Store are healthy

## 2. Where this fits in the replatform story

The legacy platform stores Postgres credentials in a config file on every RHEL VM. After this module, no in-cluster credential touches PostgreSQL — `gateway-java` authenticates as itself via Workload Identity. This is the single biggest security-posture win of the replatform.

## 3. Level target

- **L300:** Create the UAMI, federation, and role assignment by hand for `gateway-java`; verify a token-based Postgres connect from a Pod.
- **L400:** Repeat for `parser-cpp` and `ops-console`, then encode them in Terraform.

## 4. Talk track *(trainer)*

Workload Identity vs everything that came before:
- Pod Identity (v1) is **deprecated**; do not ship anything new on it.
- AAD Pod Identity (v2) was an interim hack — avoid.
- **Workload Identity** uses the cluster's OIDC issuer + federated credentials, so a Pod's ServiceAccount token is exchanged for an Entra access token. **No secret is mounted.**

Mention the failure mode the room will hit later: federated credential **subject mismatch** between what Entra expects and what the SA actually emits. Show the format `system:serviceaccount:<ns>:<sa>`.

## 5. Demo cues *(trainer)*

- Run `az aks command invoke` on your own demo cluster live; this is the only way to reach a private cluster without setting up a tunnel.
- Show one failed `kubectl get secret` from a Pod *without* the federated credential, then the successful one *with* it — the contrast lands the concept.

## 6. Participant steps

### 6.1 Reach the cluster
```bash
RG=$(terraform -chdir=infra/terraform/envs/lab output -raw primary_rg)
AKS=$(terraform -chdir=infra/terraform/envs/lab output -raw aks_primary_name)
az aks command invoke -g $RG -n $AKS --command "kubectl get nodes -o wide"
az aks command invoke -g $RG -n $AKS --command "kubectl get pods -n aks-istio-system"
```
Expect 3 nodes in 3 zones, `istiod` and ingress gateways `Running`.

### 6.2 Create the UAMI for gateway-java
```bash
LOC=eastus2
UAMI=$(az identity create -g $RG -n uami-gateway-java -l $LOC -o tsv --query clientId)
PRINCIPAL=$(az identity show -g $RG -n uami-gateway-java -o tsv --query principalId)
OIDC=$(az aks show -g $RG -n $AKS -o tsv --query oidcIssuerProfile.issuerUrl)

az identity federated-credential create \
  --identity-name uami-gateway-java -g $RG \
  --name fic-gateway-java \
  --issuer "$OIDC" \
  --subject "system:serviceaccount:messaging:gateway-java" \
  --audiences api://AzureADTokenExchange
```

### 6.3 Grant it Key Vault + Postgres access
```bash
KV_ID=$(az keyvault show -g $RG -n <kv> --query id -o tsv)
az role assignment create --assignee $PRINCIPAL --scope $KV_ID --role "Key Vault Secrets User"

PG=$(terraform -chdir=infra/terraform/envs/lab output -raw postgres_primary_name)
az postgres flexible-server identity assign -g $RG -n $PG --identity uami-gateway-java
az postgres flexible-server ad-admin create -g $RG -s $PG \
  --display-name gateway-java --object-id $PRINCIPAL --type ServicePrincipal
```

### 6.4 Wire the UAMI into the ServiceAccount manifest
Edit [`k8s/base/gateway-java.yaml`](../../k8s/base/gateway-java.yaml) and replace `REPLACE_UAMI_CLIENT_ID` with `$UAMI`. Commit & push — Argo CD will reconcile in M03.

### 6.5 Smoke-test Workload Identity from a throwaway Pod
```bash
az aks command invoke -g $RG -n $AKS --command "
  kubectl run wi-test --rm -it --restart=Never \
    --image=mcr.microsoft.com/azure-cli \
    --overrides='{\"spec\":{\"serviceAccountName\":\"gateway-java\"}}' \
    -- az login --federated-token \$(cat /var/run/secrets/azure/tokens/azure-identity-token) \
                --service-principal -u $UAMI -t \$AZURE_TENANT_ID
"
```

## 7. Validation

- `kubectl get nodes` returns 3 nodes across 3 zones.
- `aks-istio-system` Pods all `Running`.
- The throwaway Pod's `az login` succeeds with no static credential.
- A `psql` from a Pod against `postgres_primary_fqdn` using an Entra token succeeds.

## 8. Stretch (L400)

- Create UAMIs + federated credentials for `parser-cpp` and `ops-console` and encode them in Terraform.
- Enable **Azure Policy add-on** for AKS and add the *Pod Security Restricted* baseline; observe what breaks and fix it before M03.
- Turn on **image cleaner** + **image integrity** policies; sign the images you'll push in M03 with notation.

## 9. Cleanup

None. UAMIs persist for the duration of the workshop.
