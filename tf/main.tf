variable "cloudflare_account_id" {
  type = string
}

variable "cloudflare_api_token" {
  type = string
}

variable "gh_username" {
  type = string
}

variable "d1_id" {
  type = string
}

terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
      version = "3.31.0"
    }

    random = {
      source = "hashicorp/random"
      version = "3.4.3"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_workers_kv_namespace" "wildebeest_cache" {
  account_id = var.cloudflare_account_id
  title = "wildebeest-cache"
}

resource "random_string" "user_key" {
  length           = 256
  special          = false
}

resource "cloudflare_pages_project" "wildebeest_pages_project" {
  account_id = var.cloudflare_account_id
  name              = "wildebeest-${var.gh_username}"
  production_branch = "main"
  build_config {
      build_command       = "yarn build"
      destination_dir     = "frontend/dist"
  }
  deployment_configs {
    production {
      environment_variables = {
        /* API key with Cloudflare Images perms */
        CF_ACCOUNT_ID = ""
        CF_API_TOKEN  = ""

        USER_KEY = random_string.user_key.result
      }
      kv_namespaces = {
        KV_CACHE = cloudflare_workers_kv_namespace.wildebeest_cache.id
      }
      d1_databases = {
        D1_BINDING = var.d1_id
      }
    }
  }
}

resource "cloudflare_access_application" "wildebeest_access" {
  account_id                = var.cloudflare_account_id
  name                      = "wildebeest-${var.gh_username}"
  domain                    = "${cloudflare_pages_project.wildebeest_pages_project.subdomain}/oauth/authorize"
  type                      = "self_hosted"
  session_duration          = "168h"
  auto_redirect_to_identity = false
}

output "access_aud" {
  value = cloudflare_access_application.wildebeest_access.aud
}
