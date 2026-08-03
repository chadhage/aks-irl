variable "naming" { type = any }
variable "tags" { type = map(string) }
variable "resource_group_name" { type = string }
variable "primary_origin_host" { type = string }
variable "secondary_origin_host" { type = string }

resource "azurerm_cdn_frontdoor_profile" "this" {
  name                = "${var.naming.program}-${var.naming.lab}-afd-${var.naming.suffix}"
  resource_group_name = var.resource_group_name
  sku_name            = "Standard_AzureFrontDoor"
  tags                = var.tags
}

resource "azurerm_cdn_frontdoor_firewall_policy" "this" {
  name                = "${var.naming.program}${var.naming.lab}waf${var.naming.suffix}"
  resource_group_name = var.resource_group_name
  sku_name            = azurerm_cdn_frontdoor_profile.this.sku_name
  enabled             = true
  mode                = "Prevention"
  tags                = var.tags

  managed_rule {
    type    = "DefaultRuleSet"
    version = "2.1"
    action  = "Block"
  }

  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.1"
    action  = "Block"
  }
}

resource "azurerm_cdn_frontdoor_endpoint" "this" {
  name                     = "${var.naming.program}-${var.naming.lab}-${var.naming.suffix}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id
  tags                     = var.tags
}

resource "azurerm_cdn_frontdoor_origin_group" "apps" {
  name                     = "apps"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id
  session_affinity_enabled = false

  load_balancing {
    sample_size                        = 4
    successful_samples_required        = 3
    additional_latency_in_milliseconds = 50
  }

  health_probe {
    interval_in_seconds = 30
    path                = "/healthz"
    protocol            = "Http"
    request_type        = "GET"
  }
}

resource "azurerm_cdn_frontdoor_origin" "primary" {
  name                           = "primary"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.apps.id
  enabled                        = true
  host_name                      = var.primary_origin_host
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = var.primary_origin_host
  priority                       = 1
  weight                         = 1000
  certificate_name_check_enabled = true
}

resource "azurerm_cdn_frontdoor_origin" "secondary" {
  name                           = "secondary"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.apps.id
  enabled                        = true
  host_name                      = var.secondary_origin_host
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = var.secondary_origin_host
  priority                       = 2
  weight                         = 1000
  certificate_name_check_enabled = true
}

resource "azurerm_cdn_frontdoor_route" "default" {
  name                          = "default"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.this.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.apps.id
  cdn_frontdoor_origin_ids = [
    azurerm_cdn_frontdoor_origin.primary.id,
    azurerm_cdn_frontdoor_origin.secondary.id,
  ]
  supported_protocols    = ["Http", "Https"]
  patterns_to_match      = ["/*"]
  forwarding_protocol    = "HttpOnly"
  link_to_default_domain = true
  https_redirect_enabled = true
}

resource "azurerm_cdn_frontdoor_security_policy" "this" {
  name                     = "default-waf"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.this.id

      association {
        patterns_to_match = ["/*"]

        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.this.id
        }
      }
    }
  }
}

output "endpoint" { value = "https://${azurerm_cdn_frontdoor_endpoint.this.host_name}" }
