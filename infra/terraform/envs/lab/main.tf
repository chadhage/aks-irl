locals {
  naming = {
    program = var.program
    lab     = "l${var.lab_id}"
    suffix  = random_string.suffix.result
  }

  tags = {
    program     = var.program
    lab         = local.naming.lab
    workshop    = "realtime-messaging-replatform-workshopplus"
    cost-center = "training"
    managed-by  = "terraform"
  }
}

resource "random_string" "suffix" {
  length  = 4
  upper   = false
  special = false
  numeric = true
}

# ---- Resource groups ----------------------------------------------------------

resource "azurerm_resource_group" "hub" {
  name     = "${local.naming.program}-${local.naming.lab}-rg-hub-${local.naming.suffix}"
  location = var.primary_region
  tags     = local.tags
}

resource "azurerm_resource_group" "primary" {
  name     = "${local.naming.program}-${local.naming.lab}-rg-eus2-${local.naming.suffix}"
  location = var.primary_region
  tags     = local.tags
}

resource "azurerm_resource_group" "secondary" {
  name     = "${local.naming.program}-${local.naming.lab}-rg-wus3-${local.naming.suffix}"
  location = var.secondary_region
  tags     = local.tags
}

# ---- Networking ---------------------------------------------------------------

module "network_hub" {
  source              = "../../modules/network-hub"
  resource_group_name = azurerm_resource_group.hub.name
  location            = var.primary_region
  naming              = local.naming
  tags                = local.tags
}

module "network_spoke_primary" {
  source              = "../../modules/network-spoke"
  resource_group_name = azurerm_resource_group.primary.name
  location            = var.primary_region
  region_short        = "eus2"
  naming              = local.naming
  tags                = local.tags
  hub_vnet_id         = module.network_hub.vnet_id
  hub_vnet_name       = module.network_hub.vnet_name
  hub_resource_group  = azurerm_resource_group.hub.name
}

module "network_spoke_secondary" {
  source              = "../../modules/network-spoke"
  resource_group_name = azurerm_resource_group.secondary.name
  location            = var.secondary_region
  region_short        = "wus3"
  naming              = local.naming
  tags                = local.tags
  hub_vnet_id         = module.network_hub.vnet_id
  hub_vnet_name       = module.network_hub.vnet_name
  hub_resource_group  = azurerm_resource_group.hub.name
}

# ---- Observability (shared, primary region) ----------------------------------

module "observability" {
  source              = "../../modules/observability"
  resource_group_name = azurerm_resource_group.primary.name
  location            = var.primary_region
  naming              = local.naming
  tags                = local.tags
}

# ---- Container registry (primary, geo-replicated) ----------------------------

module "acr" {
  source              = "../../modules/acr"
  resource_group_name = azurerm_resource_group.primary.name
  location            = var.primary_region
  replica_location    = var.secondary_region
  naming              = local.naming
  tags                = local.tags
}

# ---- Key Vaults --------------------------------------------------------------

module "keyvault_primary" {
  source              = "../../modules/keyvault"
  resource_group_name = azurerm_resource_group.primary.name
  location            = var.primary_region
  region_short        = "eus2"
  naming              = local.naming
  tags                = local.tags
  admin_object_ids    = var.admin_object_ids
}

module "keyvault_secondary" {
  source              = "../../modules/keyvault"
  resource_group_name = azurerm_resource_group.secondary.name
  location            = var.secondary_region
  region_short        = "wus3"
  naming              = local.naming
  tags                = local.tags
  admin_object_ids    = var.admin_object_ids
}

# ---- PostgreSQL Flexible Server ---------------------------------------------

module "postgresql" {
  source                        = "../../modules/postgresql"
  naming                        = local.naming
  tags                          = local.tags
  primary_resource_group_name   = azurerm_resource_group.primary.name
  primary_location              = var.primary_region
  primary_subnet_id             = module.network_spoke_primary.postgres_subnet_id
  primary_vnet_id               = module.network_spoke_primary.vnet_id
  secondary_resource_group_name = azurerm_resource_group.secondary.name
  secondary_location            = var.secondary_region
  secondary_subnet_id           = module.network_spoke_secondary.postgres_subnet_id
  secondary_vnet_id             = module.network_spoke_secondary.vnet_id
  administrator_object_id       = var.postgres_administrator_object_id
  administrator_principal_name  = var.postgres_administrator_principal_name
  administrator_principal_type  = var.postgres_administrator_principal_type
}

# ---- AKS clusters ------------------------------------------------------------

module "aks_primary" {
  source                     = "../../modules/aks"
  resource_group_name        = azurerm_resource_group.primary.name
  location                   = var.primary_region
  region_short               = "eus2"
  naming                     = local.naming
  tags                       = local.tags
  kubernetes_version         = var.kubernetes_version
  vnet_subnet_id             = module.network_spoke_primary.aks_subnet_id
  pod_subnet_id              = null # CNI Overlay
  log_analytics_workspace_id = module.observability.log_analytics_workspace_id
  monitor_workspace_id       = module.observability.monitor_workspace_id
  grafana_id                 = module.observability.grafana_id
  acr_id                     = module.acr.id
  admin_object_ids           = var.admin_object_ids
  user_pool_min              = var.node_pool_user_min
  user_pool_max              = var.node_pool_user_max
  enable_spot_pool           = var.enable_spot_pool
}

module "aks_secondary" {
  source                     = "../../modules/aks"
  resource_group_name        = azurerm_resource_group.secondary.name
  location                   = var.secondary_region
  region_short               = "wus3"
  naming                     = local.naming
  tags                       = local.tags
  kubernetes_version         = var.kubernetes_version
  vnet_subnet_id             = module.network_spoke_secondary.aks_subnet_id
  pod_subnet_id              = null
  log_analytics_workspace_id = module.observability.log_analytics_workspace_id
  monitor_workspace_id       = module.observability.monitor_workspace_id
  grafana_id                 = module.observability.grafana_id
  acr_id                     = module.acr.id
  admin_object_ids           = var.admin_object_ids
  user_pool_min              = var.node_pool_user_min
  user_pool_max              = var.node_pool_user_max
  enable_spot_pool           = false
}

# ---- Gateway Workload Identity ----------------------------------------------

resource "azurerm_user_assigned_identity" "gateway" {
  name                = "${local.naming.program}-${local.naming.lab}-id-gateway-${local.naming.suffix}"
  resource_group_name = azurerm_resource_group.primary.name
  location            = var.primary_region
  tags                = local.tags
}

resource "azurerm_federated_identity_credential" "gateway_primary" {
  for_each = toset(["messaging-dev", "messaging-canary", "messaging-prod"])

  name      = "gateway-primary-${trimprefix(each.value, "messaging-")}"
  parent_id = azurerm_user_assigned_identity.gateway.id
  issuer    = module.aks_primary.oidc_issuer_url
  audience  = ["api://AzureADTokenExchange"]
  subject   = "system:serviceaccount:${each.value}:gateway-java"
}

resource "azurerm_federated_identity_credential" "gateway_secondary" {
  for_each = toset(["messaging-dev", "messaging-canary", "messaging-prod"])

  name      = "gateway-secondary-${trimprefix(each.value, "messaging-")}"
  parent_id = azurerm_user_assigned_identity.gateway.id
  issuer    = module.aks_secondary.oidc_issuer_url
  audience  = ["api://AzureADTokenExchange"]
  subject   = "system:serviceaccount:${each.value}:gateway-java"
}

resource "azurerm_role_assignment" "gateway_keyvault_primary" {
  scope                = module.keyvault_primary.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.gateway.principal_id
}

resource "azurerm_role_assignment" "gateway_keyvault_secondary" {
  scope                = module.keyvault_secondary.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.gateway.principal_id
}

# ---- Regional ingress addresses ---------------------------------------------

resource "azurerm_public_ip" "ingress_primary" {
  name                = "${local.naming.program}-${local.naming.lab}-pip-ingress-eus2-${local.naming.suffix}"
  resource_group_name = azurerm_resource_group.primary.name
  location            = var.primary_region
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1", "2", "3"]
  domain_name_label   = "${local.naming.program}-${local.naming.lab}-ingress-eus2-${local.naming.suffix}"
  tags                = local.tags
}

resource "azurerm_public_ip" "ingress_secondary" {
  name                = "${local.naming.program}-${local.naming.lab}-pip-ingress-wus3-${local.naming.suffix}"
  resource_group_name = azurerm_resource_group.secondary.name
  location            = var.secondary_region
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1", "2", "3"]
  domain_name_label   = "${local.naming.program}-${local.naming.lab}-ingress-wus3-${local.naming.suffix}"
  tags                = local.tags
}

# ---- Front Door --------------------------------------------------------------

module "front_door" {
  source                = "../../modules/front-door"
  resource_group_name   = azurerm_resource_group.primary.name
  naming                = local.naming
  tags                  = local.tags
  primary_origin_host   = azurerm_public_ip.ingress_primary.fqdn
  secondary_origin_host = azurerm_public_ip.ingress_secondary.fqdn
}
