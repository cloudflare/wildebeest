[Index](../README.md) ┊ [Back](../) ┊ [Getting started](getting-started.md)

## Requirements

Wildebeest is a full-stack app running on top of Cloudflare Pages using [Pages Functions](https://developers.cloudflare.com/pages/platform/functions/). We are of course assuming that you have a Cloudflare account (click [here](https://dash.cloudflare.com/sign-up) if you don't) and have at least one [zone](https://www.cloudflare.com/en-gb/learning/dns/glossary/dns-zone/) using Cloudflare. If you don't have a zone, you can use [Cloudflare Registrar](https://www.cloudflare.com/en-gb/products/registrar/) to register new a new domain or [transfer](https://developers.cloudflare.com/registrar/get-started/transfer-domain-to-cloudflare/) an existing one.

Some features, like data persistence, access controls, media storage, are handled by other Cloudflare products:

- [D1](https://developers.cloudflare.com/d1/) for the database.
- [Workers KV](https://developers.cloudflare.com/workers/learning/how-kv-works/) for terraform state storage.
- [Durable Objects](https://developers.cloudflare.com/workers/learning/using-durable-objects/) for strong-consistency object caching.
- [Queues](https://developers.cloudflare.com/queues/) for asynchronous jobs.
- [Zero Trust Access](https://www.cloudflare.com/en-gb/products/zero-trust/access/) to handle user authentication and SSO on [any identity provider](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/).
- [Images](https://www.cloudflare.com/en-gb/products/cloudflare-images/) for media handling.

Most of our products offer a [generous free plan](https://www.cloudflare.com/en-gb/plans/) that allows our users to try them for personal or hobby projects that aren’t business-critical, however you will need a few paid subscriptions before you can use Wildebeest. These subscriptions are not specific to your Wildebeest instance, you can use them freely, manage them in the dashboard, or use them with other Workers projects.

- You need to subscribe one of the paid [Images](https://developers.cloudflare.com/images/cloudflare-images/) plans. Login into your account, select select **_Images_** on the left menu, and then select the plan that best fits your needs. The lowest $5/month plan will give 100,000 images of storage capacity.
- You need to subscribe Workers Unbound. To do that, go to your account page and select **_Workers_** > **_Overview_** > **_Default Usage Model_** > **_Change_** and [chose](https://developers.cloudflare.com/workers/platform/pricing/#default-usage-model) Unbound. Make sure your Pages project is using Unbound too, after you deploy it. Go to **_Pages_** > **_wildebeest-username_** > **_Settings_** > **_Functions_** and change the usage model to Unbound. The minimum $5/month Workers Paid plan has [plenty of room space](https://developers.cloudflare.com/workers/platform/limits/) for Wildebeest.

Because you subscribed a Workers Paid plan to use Unbound, you also get Durable Objects and Queues and no further action is required. Please refer to our [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [Queues limits](https://developers.cloudflare.com/queues/limits/) pages for more information. Queues requires the Workers Paid plan to use, but [does not increase](https://developers.cloudflare.com/queues/pricing/) your monthly subscription cost.

[Index](../README.md) ┊ [Back](../) ┊ [Getting started](getting-started.md)
