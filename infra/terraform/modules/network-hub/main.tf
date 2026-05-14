variable "naming" { type = any }
variable "tags" { type = map(string) }
variable "resource_group_name" { type = string }
variable "location" { type = string }

resource "azurerm_virtual_network" "hub" {
  name                = "${var.naming.program}-${var.naming.lab}-vnet-hub-${var.naming.suffix}"
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = ["10.0.0.0/22"]
  tags                = var.tags
}

resource "azurerm_subnet" "firewall" {
  name                 = "AzureFirewallSubnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.hub.name
  address_prefixes     = ["10.0.0.0/26"]
}

resource "azurerm_subnet" "bastion" {
  name                 = "AzureBastionSubnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.hub.name
  address_prefixes     = ["10.0.1.0/26"]
}

# NOTE: Bastion + Firewall provisioning is intentionally optional/disabled by default
# to keep sandbox costs predictable. Module 02 turns them on as a stretch goal.

output "vnet_id" { value = azurerm_virtual_network.hub.id }
output "vnet_name" { value = azurerm_virtual_network.hub.name }
