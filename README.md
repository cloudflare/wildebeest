# Wildebeest

Wildebeest is an [ActivityPub](https://www.w3.org/TR/activitypub/) and [Mastodon](https://joinmastodon.org/)-compatible server whose goal is to allow anyone to operate their Fediverse server and identity on their domain without needing to keep infrastructure, with minimal setup and maintenance, and running in minutes.

Wildebeest runs on top Cloudflare's [Supercloud](https://blog.cloudflare.com/welcome-to-the-supercloud-and-developer-week-2022/), uses [Workers](https://workers.cloudflare.com/) and [Pages](https://pages.cloudflare.com/), the [D1 database](https://developers.cloudflare.com/d1/) to store metadata and configurations, [Zero Trust Access](https://www.cloudflare.com/en-gb/products/zero-trust/access/) to handle authentication and [Images](https://www.cloudflare.com/en-gb/products/cloudflare-images/) for media handling.

Currently, Wildebeest supports the following features:

- Authentication and automatic profile creation.
- Message signing & notification.
- Inbox and Outbox notes (text, mentions and images), follow, announce (reblog), accept (friend), like.
- Server to server federation.
- Web client for content exploration (read-only).
- Compatibility with [other Mastodon clients](#supported-clients) (Mobile iOS/Android and Web).

Cloudflare will continue to evolve this open-source project with additional features over time and listen to the community feedback to steer our priorities. Pull requests and issues are welcome too.

## Requirements

Wildebeest is a full-stack app running on top of Cloudflare Pages using [Pages Functions](https://developers.cloudflare.com/pages/platform/functions/). We are of course assuming that you have a Cloudflare account (click [here](https://dash.cloudflare.com/sign-up) if you don't) and have at least one [zone](https://www.cloudflare.com/en-gb/learning/dns/glossary/dns-zone/) using Cloudflare. If you don't have a zone, you can use [Cloudflare Registrar](https://www.cloudflare.com/en-gb/products/registrar/) to register new a new domain or [transfer](https://developers.cloudflare.com/registrar/get-started/transfer-domain-to-cloudflare/) an existing one.

Some features, like data persistence, access controls, media storage, are handled by other Cloudflare products:

- [D1](https://developers.cloudflare.com/d1/) for the database.
- [Workers KV](https://developers.cloudflare.com/workers/learning/how-kv-works/) for object caching.
- [Zero Trust Access](https://www.cloudflare.com/en-gb/products/zero-trust/access/) to handle user authentication and SSO on [any identity provider](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/).
- [Images](https://www.cloudflare.com/en-gb/products/cloudflare-images/) for media handling.

Most of our products offer a [generous free plan](https://www.cloudflare.com/en-gb/plans/) that allows our users to try them for personal or hobby projects that aren’t business-critical. However the **_Images_** one doesn't have a free tier, so for setting up your instance you need to activate one of the paid **_Images_** plans.

### Images plan

To activate **_Images_**, please login into your account, select **_Images_** on the left menu, and then select the plan that best fits your needs.

![images subscription](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/fd07dede-a883-4372-b0cf-3afb6b2ab400/public)

### API token

Before we begin, you also need to create an API token in your Cloudflare account. To do that, [login](https://dash.cloudflare.com/) into your account, and press the **_Create Token_** button under **_My Profile (top right corner) / API Tokens_**.

![create token](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/589e9e1b-5c50-4269-f039-3414454c4a00/public)

Now press **_Create Custom Token_** and add the following permissions:

- D1, account level, edit permission.
- Cloudflare Pages, account level, edit permission.
- Access: Apps and policies, account level, edit permission.
- Access: Organizations, Identity Providers and Groups, account level, read permission.
- Workers KV Storage, account level, edit permission.
- DNS, zone level, edit permission.
- Cloudflare Images, account level, edit permission.

![token permissions](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/a29c3063-dc81-470b-3d57-ce047e0b3f00/public)

You can limit the token to the specific zone where you will using Wildebeest if you want. Don't set a TTL.

Now **_Continue to Summary_**, review your settings, and **_Create Token_**. Take note of your token and store it in your password manager, you're going to need it later.

### Zone and Account IDs

You also need to take note of your Zone and Account IDs. To find them, [login](https://dash.cloudflare.com/) into your account and select the zone (domain) where you plan to use Wildebeest. Then, on the **_Overview_** page you will the following information:

![zone and account IDs](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/f595d8b7-6ce9-4ef7-7416-253efd012800/w=306)

We're all set now, let's start the installation process.

## Getting started

Wildebeest uses [Deploy to Workers](https://deploy.workers.cloudflare.com/) to automate the installation process.

**Click here to start the installation.**

[<img src="https://deploy.workers.cloudflare.com/button"/>](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/wildebeest&authed=true&fields={%22name%22:%22Zone%20ID%22,%22secret%22:%22CF_ZONE_ID%22,%22descr%22:%22Get%20your%20Zone%20ID%20from%20the%20Cloudflare%20Dashboard%22}&fields={%22name%22:%22Domain%22,%22secret%22:%22CF_DEPLOY_DOMAIN%22,%22descr%22:%22Domain%20on%20which%20your%20instance%20will%20be%20running%22}&fields={%22name%22:%22Instance%20title%22,%22secret%22:%22INSTANCE_TITLE%22,%22descr%22:%22Title%20of%20your%20instance%22}&fields={%22name%22:%22Administrator%20Email%22,%22secret%22:%22ADMIN_EMAIL%22,%22descr%22:%22An%20Email%20address%20that%20can%20be%20messaged%20regarding%20inquiries%20or%20issues%22}&fields={%22name%22:%22Instance%20description%22,%22secret%22:%22INSTANCE_DESCR%22,%22descr%22:%22A%20short,%20plain-text%20description%20of%20your%20instance%22})

Please pay attention to all the steps involved in the installation process.

- Authorize Workers to use your Github account.
- Enter your **Account ID** (from the previous section) and the **API token** that you created previously.
- Fork the repository into your personal Github account.
- Enable Github Actions.
- Open a new tab to `https://github.com/your-username/wildebeest` and create two secrets (CF_ZONE_ID and CF_DEPLOY_DOMAIN) under your Github Repository Actions settings. **See section below for detailed instructions**.
- Deploy.

The installation script will now build and deploy your project to Cloudflare Pages and will run a [Terraform script](https://github.com/cloudflare/wildebeest/blob/main/tf/main.tf) to configure the D1, KV, DNS, Images and Access settings automatically for you.

![deploy to workers](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/00d9a77c-440f-46e5-b2bf-ccd198815800/public)

### Github Actions secrets

In the installation script above, after you **_Enable Github Actions_**, you need to create two secrets under your forked repo, by going to **_Settings / Secrets / Actions_** and clicking on the **_New repository secret_** button. They are:

- **CF_ZONE_ID** - Use the Zone ID that you got from the requirements above.
- **CF_DEPLOY_DOMAIN** - The full FQDN domain where you want to deploy your Wildebeest server. Example: social.example.com

**This step is critical. If you miss it, your deployment will fail.**

![github actions secrets](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/c1e5d33f-2314-42be-0b29-b487bd386400/public)

## Finish installation

If you followed all the steps, you should see a successful Github Actions build.

![github actions secrets](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/2f00e3e4-aace-46f9-f0f4-eaeceb691a00/w=915)

You can also confirm in the Cloudflare [dashboard](https://dash.cloudflare.com) that the Pages project, DNS entry, KV namespace, D1 database and Access rule were all created and configured.

Almost there, only two last steps missing:

### Configure the access rule

The installation process automatically created a [Zero Trust Access application](https://developers.cloudflare.com/cloudflare-one/applications/) called `wildebeest-your-github-user` for you. Now you need to create a [policy](https://developers.cloudflare.com/cloudflare-one/policies/) that defines who can have access to your Wildebeest instance.

Go to https://one.dash.cloudflare.com/access and select your account, then select **_Access / Applications_** and Edit the `wildebeest-your-github-user` application.

![access applications](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/c93d68e8-ddfc-457d-bc63-cc50472e9e00/public)

Now click **_Add a policy_**. Name the policy `wildebeest-policy`, set the action to **_Allow_**, and add an include rule with the list of Emails that you want to allow and then click **_Save policy_**

![access policy](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/f6b1238f-22c3-4daf-6102-7178fc91ca00/public)

### Configure your server

Open your browser and go to your newly deployed Wildebeest domain `https://social.example.com/` (replace social.example.com with your domain).

Because it's the first time, you will be redirected to `/start-instance`. Fill in the title, administrator Email and description. Press **_Configure_**.

![configuration screen](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/a2055f7f-3d26-44d3-1cf7-f123a5d42000/w=400)

Go to `https://social.example.com/api/v1/instance` (replace social.example.com with your domain) and double-check your configuration. It should show:

```json
{
	"description": "My personal Wildebeest instance (powered by Cloudflare)",
	"email": "john@social.example.com",
	"title": "my fediverse",
	"registrations": false,
	"version": "4.0.2",
	"rules": [],
	"uri": "social.example.com",
	"short_description": "I can only show you the door, you're the one that has to walk through it"
}
```

That's it, you're ready to start using your Wildebeest Mastodon compatible instance.

## Supported clients

Wildebeest is Mastodon API compatible, which means that you should be able to use most of the Web, Desktop, and Mobile clients with it. However, this project is a work in progress, and nuances might affect some of their functionality.

This is the list clients that we have been using successfully while developing and testing Wildebeest:

- [Pinafore](https://pinafore.social/) web client ([source](https://github.com/nolanlawson/pinafore)).
- Mastodon [official](https://joinmastodon.org/apps) mobile client for [iOS](https://apps.apple.com/us/app/mastodon-for-iphone/id1571998974) ([source](https://github.com/mastodon/mastodon-ios)) and [Android](https://play.google.com/store/apps/details?id=org.joinmastodon.android) ([source](https://github.com/mastodon/mastodon-android)).

Wildebeest also provides a read-only web client in your instance URL, where you can explore the timelines (local and federated), posts and profiles. Please use the existing Mastodon clients to post and manage your account.

## Updating Wildebeest

Updating your Wildebeest to the latest version is as easy as going to your forked repo on GitHub and clicking the **_Sync fork_** button:

![configuration screen](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/92ddc9f2-789b-454d-f6ca-2e9011613900/w=500)

Once your fork is syncronized with the official repo, the Github Actions CI is triggered and a new build will be deployed.

## Additional Cloudflare services

Since Wildebeest is a Cloudflare app running on Pages, you can seamlessly enable additional Cloudflare services to protect or improve your server.

### Email Routing

If you want to receive Email at your @social.example.com domain, you can enable [Email Routing](https://developers.cloudflare.com/email-routing/get-started/enable-email-routing/) for free and take advantage of sophisticated Email forwarding and protection features. Simply log in to your account, select the Wildebeest zone and then click on Email to enable.

## Troubleshooting

Sometimes things go south. The GitHub Actions deployment can fail for some reason, or some configuration changed or was accidentally removed.

### Starting over

If you attempted to deploy Wildebeest in your account and something failed, or you simply want to reinstall everything from scratch again, you need to do manual checkups and cleaning before you start over.

- Go to your zone DNS settings and delete the CNAME record that points to `wildebeest-username.pages.dev`
- Go to your account Pages section and delete the `wildebeest-username` project (make sure you remove the custom domain first if it's been configured).
- Go to your account Workers / KV section and delete the `wildebeest-username-cache` namespace.
- Go to your account Workers / D1 and delete the `wildebeest-username` database.
- Launch [Zero Trust](https://one.dash.cloudflare.com/), select your account, go to Access / Applications and delete the `wildebeest-username` application.
- Delete your GitHub wildebeest forked repo.

You can now start a clean install.
