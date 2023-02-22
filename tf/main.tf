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

variable "name_suffix" {
  type = string
}

variable "d1_id" {
  type = string
  sensitive = true
}

variable "do_cache_id" {
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

variable "sentry_dsn" {
  type = string
  sensitive = true
}
variable "sentry_access_client_id" {
  type = string
  sensitive = true
}
variable "sentry_access_client_secret" {
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

// The KV cache namespace isn't used anymore but Terraform isn't able
// to remove the binding from the Pages project, so leaving for now.
resource "cloudflare_workers_kv_namespace" "wildebeest_cache" {	
  account_id = var.cloudflare_account_id	
  title = "wildebeest-${lower(var.name_suffix)}-cache"	
}

resource "cloudflare_workers_kv_namespace" "terraform_state" {
  account_id = var.cloudflare_account_id
  title = "wildebeest-terraform-${lower(var.name_suffix)}-state"
}

resource "random_password" "user_key" {
  length  = 256
  special = false
}

resource "cloudflare_pages_project" "wildebeest_pages_project" {
  account_id = var.cloudflare_account_id
  name              = "wildebeest-${lower(var.name_suffix)}"
  production_branch = "sven/neon"

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
        VAPID_JWK      = sensitive(file("${path.module}/vapid_jwk"))

        SENTRY_DSN                  = var.sentry_dsn
        SENTRY_ACCESS_CLIENT_ID     = var.sentry_access_client_id
        SENTRY_ACCESS_CLIENT_SECRET = var.sentry_access_client_secret
      }

      kv_namespaces = {	
        KV_CACHE = sensitive(cloudflare_workers_kv_namespace.wildebeest_cache.id)	
      }

      d1_databases = {
        DATABASE = sensitive(var.d1_id)
      }

      durable_object_namespaces = {
        DO_CACHE = sensitive(var.do_cache_id)
      }

      compatibility_date = "2023-01-09"
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
  project_name = "wildebeest-${lower(var.name_suffix)}"
  domain       = trimspace(var.cloudflare_deploy_domain)

  depends_on = [
    cloudflare_pages_project.wildebeest_pages_project,
    cloudflare_record.record,
  ]
}

resource "cloudflare_access_application" "wildebeest_access" {
  account_id                = var.cloudflare_account_id
  name                      = "wildebeest-${lower(var.name_suffix)}"
  domain                    = "${trimspace(var.cloudflare_deploy_domain)}/oauth/authorize"
  type                      = "self_hosted"
  session_duration          = "730h"
  auto_redirect_to_identity = false
}
