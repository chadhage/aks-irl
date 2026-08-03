variable "naming" { type = any }
variable "tags" { type = map(string) }
variable "primary_resource_group_name" { type = string }
variable "primary_location" { type = string }
variable "primary_subnet_id" { type = string }
variable "primary_vnet_id" { type = string }
variable "secondary_resource_group_name" { type = string }
variable "secondary_location" { type = string }
variable "secondary_subnet_id" { type = string }
variable "secondary_vnet_id" { type = string }
variable "administrator_object_id" { type = string }
variable "administrator_principal_name" { type = string }
variable "administrator_principal_type" {
  type    = string
  default = "Group"
  validation {
    condition     = contains(["Group", "ServicePrincipal", "User"], var.administrator_principal_type)
    error_message = "administrator_principal_type must be Group, ServicePrincipal, or User."
  }
}

data "azurerm_client_config" "current" {}

resource "azurerm_private_dns_zone" "postgres" {
  name                = "${var.naming.program}-${var.naming.lab}-${var.naming.suffix}.postgres.database.azure.com"
  resource_group_name = var.primary_resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "primary" {
  name                  = "link-primary"
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  resource_group_name   = var.primary_resource_group_name
  virtual_network_id    = var.primary_vnet_id
  tags                  = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "secondary" {
  name                  = "link-secondary"
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  resource_group_name   = var.primary_resource_group_name
  virtual_network_id    = var.secondary_vnet_id
  tags                  = var.tags
}

resource "azurerm_postgresql_flexible_server" "primary" {
  name                          = "${var.naming.program}-${var.naming.lab}-pg-eus2-${var.naming.suffix}"
  resource_group_name           = var.primary_resource_group_name
  location                      = var.primary_location
  version                       = "16"
  delegated_subnet_id           = var.primary_subnet_id
  private_dns_zone_id           = azurerm_private_dns_zone.postgres.id
  public_network_access_enabled = false
  sku_name                      = "GP_Standard_D2ds_v5"
  storage_mb                    = 32768
  storage_tier                  = "P4"
  auto_grow_enabled             = true
  backup_retention_days         = 14
  geo_redundant_backup_enabled  = true
  zone                          = "1"
  tags                          = var.tags

  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = false
    tenant_id                     = data.azurerm_client_config.current.tenant_id
  }

  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }

  identity {
    type = "SystemAssigned"
  }

  maintenance_window {
    day_of_week  = 0
    start_hour   = 3
    start_minute = 0
  }

  depends_on = [
    azurerm_private_dns_zone_virtual_network_link.primary,
    azurerm_private_dns_zone_virtual_network_link.secondary,
  ]
}

resource "azurerm_postgresql_flexible_server_database" "messaging" {
  name      = "messaging"
  server_id = azurerm_postgresql_flexible_server.primary.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_active_directory_administrator" "primary" {
  server_name         = azurerm_postgresql_flexible_server.primary.name
  resource_group_name = var.primary_resource_group_name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  object_id           = var.administrator_object_id
  principal_name      = var.administrator_principal_name
  principal_type      = var.administrator_principal_type
}

resource "azurerm_postgresql_flexible_server" "secondary" {
  name                          = "${var.naming.program}-${var.naming.lab}-pg-wus3-${var.naming.suffix}"
  resource_group_name           = var.secondary_resource_group_name
  location                      = var.secondary_location
  create_mode                   = "Replica"
  source_server_id              = azurerm_postgresql_flexible_server.primary.id
  delegated_subnet_id           = var.secondary_subnet_id
  private_dns_zone_id           = azurerm_private_dns_zone.postgres.id
  public_network_access_enabled = false
  sku_name                      = "GP_Standard_D2ds_v5"
  storage_mb                    = 32768
  storage_tier                  = "P4"
  zone                          = "1"
  tags                          = var.tags

  depends_on = [azurerm_postgresql_flexible_server_active_directory_administrator.primary]
}

resource "azurerm_postgresql_flexible_server_active_directory_administrator" "secondary" {
  server_name         = azurerm_postgresql_flexible_server.secondary.name
  resource_group_name = var.secondary_resource_group_name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  object_id           = var.administrator_object_id
  principal_name      = var.administrator_principal_name
  principal_type      = var.administrator_principal_type
}

output "primary_name" { value = azurerm_postgresql_flexible_server.primary.name }
output "primary_fqdn" { value = azurerm_postgresql_flexible_server.primary.fqdn }
output "secondary_name" { value = azurerm_postgresql_flexible_server.secondary.name }
output "secondary_fqdn" { value = azurerm_postgresql_flexible_server.secondary.fqdn }
output "database_name" { value = azurerm_postgresql_flexible_server_database.messaging.name }
output "private_dns_zone_id" { value = azurerm_private_dns_zone.postgres.id }