output "primary_resource_group" {
  value = azurerm_resource_group.primary.name
}

output "secondary_resource_group" {
  value = azurerm_resource_group.secondary.name
}

output "aks_primary_name" {
  value = module.aks_primary.cluster_name
}

output "aks_secondary_name" {
  value = module.aks_secondary.cluster_name
}

output "acr_login_server" {
  value = module.acr.login_server
}

output "grafana_endpoint" {
  value = module.observability.grafana_endpoint
}

output "front_door_endpoint" {
  value = module.front_door.endpoint
}

output "key_vault_primary_uri" {
  value = module.keyvault_primary.uri
}

output "key_vault_secondary_uri" {
  value = module.keyvault_secondary.uri
}
