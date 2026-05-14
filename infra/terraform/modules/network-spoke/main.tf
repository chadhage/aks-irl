variable "naming" { type = any }
variable "tags" { type = map(string) }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "region_short" { type = string }
variable "hub_vnet_id" { type = string }
variable "hub_vnet_name" { type = string }
variable "hub_resource_group" { type = string }

locals {
  # eus2 = 10.10/16  |  wus3 = 10.20/16
  base_cidr = var.region_short == "eus2" ? "10.10.0.0/16" : "10.20.0.0/16"
  aks_cidr  = var.region_short == "eus2" ? "10.10.0.0/22" : "10.20.0.0/22"
  pe_cidr   = var.region_short == "eus2" ? "10.10.4.0/24" : "10.20.4.0/24"
}

resource "azurerm_virtual_network" "spoke" {
  name                = "${var.naming.program}-${var.naming.squad}-vnet-${var.region_short}-${var.naming.suffix}"
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = [local.base_cidr]
  tags                = var.tags
}

resource "azurerm_subnet" "aks_nodes" {
  name                 = "snet-aks-nodes"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.spoke.name
  address_prefixes     = [local.aks_cidr]
}

resource "azurerm_subnet" "private_endpoints" {
  name                              = "snet-pe"
  resource_group_name               = var.resource_group_name
  virtual_network_name              = azurerm_virtual_network.spoke.name
  address_prefixes                  = [local.pe_cidr]
  private_endpoint_network_policies = "Enabled"
}

# Peerings (spoke <-> hub)
resource "azurerm_virtual_network_peering" "spoke_to_hub" {
  name                      = "peer-to-hub"
  resource_group_name       = var.resource_group_name
  virtual_network_name      = azurerm_virtual_network.spoke.name
  remote_virtual_network_id = var.hub_vnet_id
  allow_forwarded_traffic   = true
}

resource "azurerm_virtual_network_peering" "hub_to_spoke" {
  name                      = "peer-to-${var.region_short}-${var.naming.squad}"
  resource_group_name       = var.hub_resource_group
  virtual_network_name      = var.hub_vnet_name
  remote_virtual_network_id = azurerm_virtual_network.spoke.id
  allow_forwarded_traffic   = true
}

output "vnet_id" { value = azurerm_virtual_network.spoke.id }
output "aks_subnet_id" { value = azurerm_subnet.aks_nodes.id }
output "pe_subnet_id" { value = azurerm_subnet.private_endpoints.id }
