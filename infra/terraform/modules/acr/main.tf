variable "naming" { type = any }
variable "tags" { type = map(string) }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "replica_location" { type = string }

resource "azurerm_container_registry" "this" {
  name                          = "${var.naming.program}${var.naming.squad}acr${var.naming.suffix}"
  resource_group_name           = var.resource_group_name
  location                      = var.location
  sku                           = "Premium"
  admin_enabled                 = false
  zone_redundancy_enabled       = true
  public_network_access_enabled = true # tightened in Module 02 stretch
  tags                          = var.tags

  georeplications {
    location                = var.replica_location
    zone_redundancy_enabled = true
    tags                    = var.tags
  }

  retention_policy_in_days = 30
}

output "id" { value = azurerm_container_registry.this.id }
output "login_server" { value = azurerm_container_registry.this.login_server }
output "name" { value = azurerm_container_registry.this.name }
