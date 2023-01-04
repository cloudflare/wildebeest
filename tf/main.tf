variable "cloudflare_account_id" {
  type = string
}

variable "cloudflare_zone_name" {
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

variable "access_auth_domain" {
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

data "cloudflare_zone" "zone" {
  account_id = var.cloudflare_account_id
  name       = var.cloudflare_zone_name
}


resource "cloudflare_workers_kv_namespace" "wildebeest_cache" {
  account_id = var.cloudflare_account_id
  title = "wildebeest-${var.gh_username}-cache"
}

resource "random_password" "user_key" {
  length  = 256
  special = false
}

resource "cloudflare_pages_project" "wildebeest_pages_project" {
  account_id = var.cloudflare_account_id
  name              = "wildebeest-${var.gh_username}"
  production_branch = "main"

  deployment_configs {
    production {
      environment_variables = {
        /* API key with Cloudflare Images perms */
        CF_ACCOUNT_ID = ""
        CF_API_TOKEN  = ""

        USER_KEY = random_password.user_key.result

        DOMAIN = var.cloudflare_zone_name
        ACCESS_AUD = cloudflare_access_application.wildebeest_access.aud
        ACCESS_AUTH_DOMAIN = var.access_auth_domain
      }
      kv_namespaces = {
        KV_CACHE = cloudflare_workers_kv_namespace.wildebeest_cache.id
      }
      d1_databases = {
        DATABASE = var.d1_id
      }
    }
  }
}

resource "cloudflare_record" "record" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "@"
  value   = cloudflare_pages_project.wildebeest_pages_project.subdomain
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_pages_domain" "domain" {
  account_id   = var.cloudflare_account_id
  project_name = "wildebeest-${var.gh_username}"
  domain       = var.cloudflare_zone_name
}

resource "cloudflare_access_application" "wildebeest_access" {
  account_id                = var.cloudflare_account_id
  name                      = "wildebeest-${var.gh_username}"
  domain                    = "${var.cloudflare_zone_name}/oauth/authorize"
  type                      = "self_hosted"
  session_duration          = "168h"
  auto_redirect_to_identity = false
}

resource "cloudflare_access_policy" "policy" {
  application_id = cloudflare_access_application.wildebeest_access.id
  zone_id        = data.cloudflare_zone.zone.id
  name           = "policy"
  precedence     = "1"
  decision       = "allow"

  include {
    email = ["test@example.com"]
  }
}
