> :warning:  This project has been archived and is no longer actively maintained or supported. Feel free to fork this repository, explore the codebase, and adapt it to your needs. Wildebeest was an opportunity to showcase our technology stack's power and versatility and prove how anyone can use Cloudflare to build larger applications that involve multiple systems and complex requirements.

# Wildebeest

![wildebeest illustration](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/3654789b-089c-493a-85b4-be3f8f594c00/header)

Wildebeest is an [ActivityPub](https://www.w3.org/TR/activitypub/) and [Mastodon](https://joinmastodon.org/)-compatible server whose goal is to allow anyone to operate their Fediverse server and identity on their domain without needing to keep infrastructure, with minimal setup and maintenance, and running in minutes.

Wildebeest runs on top Cloudflare's [Supercloud](https://blog.cloudflare.com/welcome-to-the-supercloud-and-developer-week-2022/), uses [Workers](https://workers.cloudflare.com/), [Pages](https://pages.cloudflare.com/), [Durable Objects](https://developers.cloudflare.com/workers/learning/using-durable-objects/), [Queues](https://developers.cloudflare.com/queues/), the [D1 database](https://developers.cloudflare.com/d1/) to store metadata and configurations, [Zero Trust Access](https://www.cloudflare.com/en-gb/products/zero-trust/access/) to handle authentication and [Images](https://www.cloudflare.com/en-gb/products/cloudflare-images/) for media handling.

Currently, Wildebeest supports the following features:

- [ActivityPub](https://www.w3.org/TR/activitypub/), [WebFinger](https://www.rfc-editor.org/rfc/rfc7033), [NodeInfo](https://github.com/cloudflare/wildebeest/tree/main/functions/nodeinfo), [WebPush](https://datatracker.ietf.org/doc/html/rfc8030) and [Mastodon-compatible](https://docs.joinmastodon.org/api/) APIs. Wildebeest can connect to or receive connections from other Fediverse servers.
- Compatible with the most popular Mastodon [web](https://github.com/nolanlawson/pinafore) (like [Pinafore](https://github.com/nolanlawson/pinafore)), desktop, and [mobile clients](https://joinmastodon.org/apps). We also provide a simple read-only web interface to explore the timelines and user profiles.
- You can publish, edit, boost, or delete posts, sorry, toots. We support text, images, and (soon) video.
- Anyone can follow you; you can follow anyone.
- You can search for content.
- You can register one or multiple accounts under your instance. Authentication can be email-based on or using any Cloudflare Access compatible IdP, like GitHub or Google.
- You can edit your profile information, avatar, and header image.
- You can do [account migrations](https://docs.joinmastodon.org/user/moving/) from Mastodon to Wildebeest servers.

Cloudflare will continue to evolve this open-source project with additional features over time and listen to the community feedback to steer our priorities. Pull requests and issues are welcome too.

Please read our [announcement blog](https://blog.cloudflare.com/welcome-to-wildebeest-the-fediverse-on-cloudflare/) for more details on how we built Wildebeest.

## Tutorial

Follow this tutorial to deploy Wildebeest:

- [Requirements](docs/requirements.md)
- [Getting started](docs/getting-started.md)
- [Access policy](docs/access-policy.md)
- [Supported clients](docs/supported-clients.md)
- [Updating Wildebeest](docs/updating.md)
- [Other Cloudflare services](docs/other-services.md)
- [Troubleshooting](docs/troubleshooting.md)
