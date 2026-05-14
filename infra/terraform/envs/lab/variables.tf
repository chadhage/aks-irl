variable "subscription_id" {
  description = "Azure learning subscription ID used for this lab."
  type        = string
}

variable "lab_id" {
  description = "Two-digit lab identifier, e.g. 01. Defaults to 01 — you only need one."
  type        = string
  default     = "01"
  validation {
    condition     = can(regex("^[0-9]{2}$", var.lab_id))
    error_message = "lab_id must be two digits, e.g. 01."
  }
}

variable "program" {
  description = "Program prefix."
  type        = string
  default     = "sita"
}

variable "primary_region" {
  description = "Primary Azure region."
  type        = string
  default     = "eastus2"
}

variable "secondary_region" {
  description = "Secondary (DR) Azure region."
  type        = string
  default     = "westus3"
}

variable "kubernetes_version" {
  description = "AKS Kubernetes version (omit patch)."
  type        = string
  default     = "1.30"
}

variable "github_repo" {
  description = "GitHub repo (owner/repo) of your fork, used for OIDC federation."
  type        = string
}

variable "admin_object_ids" {
  description = "Microsoft Entra object IDs granted cluster-admin via AKS RBAC."
  type        = list(string)
  default     = []
}

variable "node_pool_user_min" {
  description = "User node-pool minimum size."
  type        = number
  default     = 1
}

variable "node_pool_user_max" {
  description = "User node-pool maximum size."
  type        = number
  default     = 5
}

variable "enable_spot_pool" {
  description = "Enable the spot node pool (set true during Module 08)."
  type        = bool
  default     = false
}
