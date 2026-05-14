variable "naming" { type = any }
variable "tags" { type = map(string) }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "region_short" { type = string }
variable "admin_object_ids" { type = list(string) }

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "this" {
  name                          = "${var.naming.program}${var.naming.squad}kv${var.region_short}${var.naming.suffix}"
  resource_group_name           = var.resource_group_name
  location                      = var.location
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  purge_protection_enabled      = false
  soft_delete_retention_days    = 7
  enabled_for_disk_encryption   = false
  enable_rbac_authorization     = true
  public_network_access_enabled = true
  tags                          = var.tags
}

resource "azurerm_role_assignment" "admins" {
  for_each             = toset(var.admin_object_ids)
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = each.value
}

output "id" { value = azurerm_key_vault.this.id }
output "name" { value = azurerm_key_vault.this.name }
output "uri" { value = azurerm_key_vault.this.vault_uri }
