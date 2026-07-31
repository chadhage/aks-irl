# Module 01 — Platform Foundation

**Time:** ~60 min wall-clock (most of it is Terraform apply)  |  **Level target:** L300

## 1. Outcomes

You will have provisioned, end-to-end with Terraform:

- A hub VNet + two regional spoke VNets (eastus2 + westus3) with peering and a baseline firewall
- A **private** AKS cluster in each region — 3 zones, Azure CNI Overlay, Istio managed addon
- ACR Premium (geo-replicated), 2× Key Vaults, Log Analytics + Managed Prometheus + Managed Grafana
- Front Door + WAF (HTTP, for the ops console)
- An external Standard Load Balancer per region (provisioned later by the `gateway-java-tcp` Service in M03)
- Azure Database for PostgreSQL — Flexible Server primary (eastus2, HA, zone-redundant) + a geo-replica (westus3)
- OIDC-federated GitHub Actions identity ready to drive everything after this module

## 2. Where this fits in the replatform story

The customer's legacy stack runs on hand-patched RHEL VMs. This module replaces *all* of the infrastructure side of that with code. Once `terraform apply` is green, every later module changes **application** or **policy**, not provisioning.

## 3. Level target

- **L300:** Apply the included Terraform, understand the outputs, and locate the AKS resource graph in the portal.
- **L400:** Add the spot node pool, enable Microsoft Defender for Containers, and turn on Azure Policy add-on baseline.

## 4. Talk track *(trainer)*

Two ideas to land:

1. **The platform/app seam is at this module's boundary.** Terraform owns everything in `infra/`; nothing in `apps/`, `k8s/`, or `gitops/` is provisioned by Terraform. If a participant ever asks "should I add the gateway-java Deployment to Terraform?" — the answer is no, and the reason is GitOps + ring-based promotion that we get to in M05.
2. **OIDC, not service principal secrets.** Walk through the federated credential. Stress that nothing in this repo holds a long-lived Azure password.

## 5. Demo cues *(trainer)*

- Show the bootstrap state store getting created on your own demo subscription before participants start theirs — `terraform apply` takes ~25 min, so trigger early.
- While the room's applies are running, open the [`infra/terraform/modules/aks/main.tf`](../../infra/terraform/modules/aks/main.tf) and walk through `local_account_disabled`, `oidc_issuer_enabled`, `workload_identity_enabled`, and the Istio addon block.

## 6. Participant steps

### 6.1 Bootstrap the Terraform state backend (one-time)
```bash
cd infra/terraform/bootstrap
terraform init
terraform apply -auto-approve
# Note the outputs: storage_account_name, container_name, resource_group
```

### 6.2 Create the GitHub OIDC identity
Follow [infra/terraform/README.md](../../infra/terraform/README.md). Add the three secrets to your fork:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

### 6.3 Configure the lab environment
```bash
cd infra/terraform/envs/lab
cp terraform.tfvars.example terraform.tfvars
# Edit: program, lab_id, admin_object_ids, primary_region, secondary_region
```

### 6.4 Plan and apply
```bash
terraform init -backend-config="resource_group_name=<bootstrap_rg>" \
               -backend-config="storage_account_name=<bootstrap_sa>" \
               -backend-config="container_name=<bootstrap_container>" \
               -backend-config="key=lab.tfstate"
terraform plan -out tfplan
terraform apply tfplan
```

### 6.5 Capture the outputs you'll need later
```bash
terraform output -raw acr_login_server
terraform output -raw aks_primary_name
terraform output -raw aks_secondary_name
terraform output -raw postgres_primary_fqdn
terraform output -raw front_door_endpoint
```

## 7. Validation

- `terraform apply` exits 0.
- All output values are non-empty.
- In the Azure portal, both resource groups (`...-rg-eus2-*` and `...-rg-wus3-*`) exist with the expected resources (AKS, KV, Postgres Flex, ACR replica).
- Tag `workshop=realtime-messaging-replatform-workshopplus` is present on every RG.

## 8. Stretch (L400)

- Set `enable_spot_pool = true` and re-apply. Inspect the resulting node pool taints and labels.
- Enable Defender for Containers on the subscription and confirm AKS shows in the Defender plan.
- Turn on the Azure Policy add-on baseline (`azurepolicy` builtin) and review what it flags by default.
- Replace one Terraform module with the equivalent **Azure Verified Module** and discuss differences.

## 9. Cleanup

None between modules. To stop billing overnight, drop `node_pool_user_min`/`max` to 0 in `terraform.tfvars` and re-apply — keeps Postgres + ACR but parks AKS workloads.
