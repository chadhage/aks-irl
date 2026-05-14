terraform {
  required_version = ">= 1.9.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.10"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "azurerm" {
  subscription_id = var.subscription_id
  features {}
}

variable "subscription_id" {
  type = string
}

variable "location" {
  type    = string
  default = "eastus2"
}

resource "random_string" "suffix" {
  length  = 4
  upper   = false
  special = false
  numeric = true
}

resource "azurerm_resource_group" "state" {
  name     = "sita-tfstate-${random_string.suffix.result}"
  location = var.location
  tags = {
    program  = "sita"
    workshop = "enterprise-scale-aks-irl"
    purpose  = "tfstate"
  }
}

resource "azurerm_storage_account" "state" {
  name                            = "sitatfstate${random_string.suffix.result}"
  resource_group_name             = azurerm_resource_group.state.name
  location                        = var.location
  account_tier                    = "Standard"
  account_replication_type        = "GZRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = true # required for terraform azurerm backend
}

resource "azurerm_storage_container" "state" {
  name                  = "tfstate"
  storage_account_id    = azurerm_storage_account.state.id
  container_access_type = "private"
}

resource "local_file" "backend_hcl" {
  filename = "${path.module}/backend.hcl"
  content  = <<-EOT
    resource_group_name  = "${azurerm_resource_group.state.name}"
    storage_account_name = "${azurerm_storage_account.state.name}"
    container_name       = "${azurerm_storage_container.state.name}"
    # set 'key' per squad, e.g. key = "squad-01.tfstate"
  EOT
}

output "instructions" {
  value = <<-EOT
    Remote state ready.

    For each squad env, run:
      terraform init -backend-config=../../bootstrap/backend.hcl -backend-config="key=squad-<id>.tfstate"
  EOT
}
