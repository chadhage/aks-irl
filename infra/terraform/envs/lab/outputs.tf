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

output "ingress_primary_public_ip" {
  value = azurerm_public_ip.ingress_primary.ip_address
}

output "ingress_primary_public_ip_name" {
  value = azurerm_public_ip.ingress_primary.name
}

output "ingress_secondary_public_ip" {
  value = azurerm_public_ip.ingress_secondary.ip_address
}

output "ingress_secondary_public_ip_name" {
  value = azurerm_public_ip.ingress_secondary.name
}

output "key_vault_primary_uri" {
  value = module.keyvault_primary.uri
}

output "key_vault_secondary_uri" {
  value = module.keyvault_secondary.uri
}

output "postgres_primary_name" {
  value = module.postgresql.primary_name
}

output "postgres_primary_fqdn" {
  value = module.postgresql.primary_fqdn
}

output "postgres_secondary_name" {
  value = module.postgresql.secondary_name
}

output "postgres_secondary_fqdn" {
  value = module.postgresql.secondary_fqdn
}

output "postgres_database_name" {
  value = module.postgresql.database_name
}

output "gateway_identity_client_id" {
  value = azurerm_user_assigned_identity.gateway.client_id
}

output "gateway_identity_name" {
  value = azurerm_user_assigned_identity.gateway.name
}

output "gateway_identity_principal_id" {
  value = azurerm_user_assigned_identity.gateway.principal_id
}
