variable "cloudflare_account_id" {
  type = string
  sensitive = true
}

variable "cloudflare_zone_id" {
  type = string
  sensitive = true
}

variable "cloudflare_deploy_domain" {
  type = string
  sensitive = true
}

variable "cloudflare_api_token" {
  type = string
  sensitive = true
}

variable "gh_username" {
  type = string
}

variable "d1_id" {
  type = string
  sensitive = true
}

variable "access_auth_domain" {
  type = string
  sensitive = true
}

variable "wd_instance_title" {
  type = string
  sensitive = true
}
variable "wd_admin_email" {
  type = string
  sensitive = true
}
variable "wd_instance_description" {
  type = string
  sensitive = true
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
  title = "wildebeest-${lower(var.gh_username)}-cache"
}

resource "cloudflare_workers_kv_namespace" "terraform_state" {
  account_id = var.cloudflare_account_id
  title = "wildebeest-terraform-${lower(var.gh_username)}-state"
}

resource "random_password" "user_key" {
  length  = 256
  special = false
}

resource "cloudflare_pages_project" "wildebeest_pages_project" {
  account_id = var.cloudflare_account_id
  name              = "wildebeest-${lower(var.gh_username)}"
  production_branch = "main"

  deployment_configs {
    production {
      environment_variables = {
        CF_ACCOUNT_ID = sensitive(var.cloudflare_account_id)
        CF_API_TOKEN = sensitive(var.cloudflare_api_token)

        USER_KEY = sensitive(random_password.user_key.result)

        DOMAIN = sensitive(trimspace(var.cloudflare_deploy_domain))
        ACCESS_AUD = sensitive(cloudflare_access_application.wildebeest_access.aud)
        ACCESS_AUTH_DOMAIN = sensitive(var.access_auth_domain)

        INSTANCE_TITLE = var.wd_instance_title
        ADMIN_EMAIL    = var.wd_admin_email
        INSTANCE_DESCR = var.wd_instance_description
      }
      kv_namespaces = {
        KV_CACHE = sensitive(cloudflare_workers_kv_namespace.wildebeest_cache.id)
      }
      d1_databases = {
        DATABASE = sensitive(var.d1_id)
      }
    }
  }
}

resource "cloudflare_record" "record" {
  zone_id = trimspace(var.cloudflare_zone_id)
  name    = trimspace(var.cloudflare_deploy_domain)
  value   = cloudflare_pages_project.wildebeest_pages_project.subdomain
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_pages_domain" "domain" {
  account_id   = var.cloudflare_account_id
  project_name = "wildebeest-${lower(var.gh_username)}"
  domain       = trimspace(var.cloudflare_deploy_domain)

  depends_on = [
    cloudflare_pages_project.wildebeest_pages_project,
    cloudflare_record.record,
  ]
}

resource "cloudflare_access_application" "wildebeest_access" {
  account_id                = var.cloudflare_account_id
  name                      = "wildebeest-${lower(var.gh_username)}"
  domain                    = "${trimspace(var.cloudflare_deploy_domain)}/oauth/authorize"
  type                      = "self_hosted"
  session_duration          = "168h"
  auto_redirect_to_identity = false
}
