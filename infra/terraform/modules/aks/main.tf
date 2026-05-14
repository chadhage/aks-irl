variable "naming" { type = any }
variable "tags" { type = map(string) }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "region_short" { type = string }
variable "kubernetes_version" { type = string }
variable "vnet_subnet_id" { type = string }
variable "pod_subnet_id" {
  type    = string
  default = null
}
variable "log_analytics_workspace_id" { type = string }
variable "monitor_workspace_id" { type = string }
variable "grafana_id" { type = string }
variable "acr_id" { type = string }
variable "admin_object_ids" { type = list(string) }
variable "user_pool_min" { type = number }
variable "user_pool_max" { type = number }
variable "enable_spot_pool" {
  type    = bool
  default = false
}

resource "azurerm_user_assigned_identity" "aks" {
  name                = "${var.naming.program}-${var.naming.pod}-aks-mi-${var.region_short}-${var.naming.suffix}"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
}

resource "azurerm_kubernetes_cluster" "this" {
  name                              = "${var.naming.program}-${var.naming.pod}-aks-${var.region_short}-${var.naming.suffix}"
  resource_group_name               = var.resource_group_name
  location                          = var.location
  dns_prefix                        = "${var.naming.program}${var.naming.pod}${var.region_short}${var.naming.suffix}"
  kubernetes_version                = var.kubernetes_version
  sku_tier                          = "Standard"
  role_based_access_control_enabled = true
  oidc_issuer_enabled               = true
  workload_identity_enabled         = true
  azure_policy_enabled              = true
  image_cleaner_enabled             = true
  local_account_disabled            = true
  private_cluster_enabled           = true
  tags                              = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.aks.id]
  }

  azure_active_directory_role_based_access_control {
    tenant_id              = data.azurerm_client_config.current.tenant_id
    azure_rbac_enabled     = true
    admin_group_object_ids = var.admin_object_ids
  }

  default_node_pool {
    name                         = "system"
    vm_size                      = "Standard_D4s_v5"
    node_count                   = 3
    zones                        = ["1", "2", "3"]
    vnet_subnet_id               = var.vnet_subnet_id
    os_disk_type                 = "Ephemeral"
    only_critical_addons_enabled = true
    type                         = "VirtualMachineScaleSets"
    upgrade_settings {
      max_surge = "33%"
    }
  }

  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay"
    network_dataplane   = "cilium"
    network_policy      = "cilium"
    load_balancer_sku   = "standard"
    outbound_type       = "loadBalancer"
    service_cidr        = "172.16.0.0/16"
    dns_service_ip      = "172.16.0.10"
    pod_cidr            = "100.64.0.0/16"
  }

  oms_agent {
    log_analytics_workspace_id      = var.log_analytics_workspace_id
    msi_auth_for_monitoring_enabled = true
  }

  monitor_metrics {
    annotations_allowed = null
    labels_allowed      = null
  }

  service_mesh_profile {
    mode     = "Istio"
    revisions = ["asm-1-23"]
  }

  maintenance_window_auto_upgrade {
    frequency   = "Weekly"
    interval    = 1
    duration    = 4
    day_of_week = "Sunday"
    start_time  = "02:00"
    utc_offset  = "+00:00"
  }

  auto_upgrade_channel       = "stable"
  node_os_upgrade_channel    = "NodeImage"
}

data "azurerm_client_config" "current" {}

resource "azurerm_kubernetes_cluster_node_pool" "user" {
  name                  = "user"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.this.id
  vm_size               = "Standard_D4s_v5"
  zones                 = ["1", "2", "3"]
  vnet_subnet_id        = var.vnet_subnet_id
  auto_scaling_enabled  = true
  min_count             = var.user_pool_min
  max_count             = var.user_pool_max
  os_disk_type          = "Ephemeral"
  mode                  = "User"
  node_labels = {
    "workload" = "apps"
  }
  upgrade_settings {
    max_surge = "33%"
  }
  tags = var.tags
}

resource "azurerm_kubernetes_cluster_node_pool" "spot" {
  count                 = var.enable_spot_pool ? 1 : 0
  name                  = "spot"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.this.id
  vm_size               = "Standard_D4s_v5"
  zones                 = ["1", "2", "3"]
  vnet_subnet_id        = var.vnet_subnet_id
  priority              = "Spot"
  eviction_policy       = "Delete"
  spot_max_price        = -1
  auto_scaling_enabled  = true
  min_count             = 0
  max_count             = 4
  os_disk_type          = "Ephemeral"
  mode                  = "User"
  node_taints = ["kubernetes.azure.com/scalesetpriority=spot:NoSchedule"]
  node_labels = {
    "workload"                            = "batch"
    "kubernetes.azure.com/scalesetpriority" = "spot"
  }
  tags = var.tags
}

# Grant AKS kubelet identity AcrPull on ACR
resource "azurerm_role_assignment" "acr_pull" {
  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.this.kubelet_identity[0].object_id
}

# Grant Grafana access to the Monitor workspace.
# NOTE: Grafana identity is created in the observability module; in production
# you'd pass its principal_id through here. For workshop simplicity we leave
# this as a documented stretch step (Module 02) rather than wire it across
# modules and risk a circular dependency.

output "cluster_name"        { value = azurerm_kubernetes_cluster.this.name }
output "cluster_id"          { value = azurerm_kubernetes_cluster.this.id }
output "oidc_issuer_url"     { value = azurerm_kubernetes_cluster.this.oidc_issuer_url }
output "kubelet_object_id"   { value = azurerm_kubernetes_cluster.this.kubelet_identity[0].object_id }
# Placeholder; populated post-install (Argo CD bootstraps Istio gateway service of LB type)
output "istio_ingress_fqdn"  { value = "${azurerm_kubernetes_cluster.this.name}.placeholder" }
