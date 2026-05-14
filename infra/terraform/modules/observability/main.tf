variable "naming" { type = any }
variable "tags" { type = map(string) }
variable "resource_group_name" { type = string }
variable "location" { type = string }

resource "azurerm_log_analytics_workspace" "this" {
  name                = "${var.naming.program}-${var.naming.squad}-law-${var.naming.suffix}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_monitor_workspace" "this" {
  name                = "${var.naming.program}-${var.naming.squad}-amw-${var.naming.suffix}"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
}

resource "azurerm_dashboard_grafana" "this" {
  name                              = "${var.naming.program}-${var.naming.squad}-graf-${var.naming.suffix}"
  resource_group_name               = var.resource_group_name
  location                          = var.location
  grafana_major_version             = "11"
  api_key_enabled                   = true
  deterministic_outbound_ip_enabled = false
  public_network_access_enabled     = true
  tags                              = var.tags

  identity {
    type = "SystemAssigned"
  }

  azure_monitor_workspace_integrations {
    resource_id = azurerm_monitor_workspace.this.id
  }
}

output "log_analytics_workspace_id" { value = azurerm_log_analytics_workspace.this.id }
output "monitor_workspace_id" { value = azurerm_monitor_workspace.this.id }
output "grafana_id" { value = azurerm_dashboard_grafana.this.id }
output "grafana_endpoint" { value = azurerm_dashboard_grafana.this.endpoint }
