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

# ---- Front Door --------------------------------------------------------------

module "front_door" {
  source                = "../../modules/front-door"
  resource_group_name   = azurerm_resource_group.primary.name
  naming                = local.naming
  tags                  = local.tags
  primary_origin_host   = module.aks_primary.istio_ingress_fqdn
  secondary_origin_host = module.aks_secondary.istio_ingress_fqdn
}
