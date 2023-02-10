[Index](../README.md) ┊ [Back](getting-started.md) ┊ [Supported clients](supported-clients.md)

## Access Policy

### Wildebeest has no user registration

Wildebeest uses [Zero Trust Access](https://www.cloudflare.com/en-gb/products/zero-trust/access/) to handle user authentication. It assumes that your users will register with another identity provider (Zero Trust supports [many providers](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/) or your custom one that implements [Generic SAML 2.0](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/generic-saml/)).

When you start using Wildebeest with a client, you don't need to register. Instead, you go straight to log in, which will redirect you to the Access page and handle the authentication step according to the policy that you defined earlier.

When authenticated, Access will redirect you back to Wildebeest. The first time this happens, we will detect that we don't have information about the user and ask for your **Username** and **Display Name**. This will be asked only once and is what will show in your public Mastodon profile.

![first login](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/b94b0482-4e00-4b72-469f-26c4ba19c400/w=850)

### Configure your access policy

The installation process automatically created a [Zero Trust Access application](https://developers.cloudflare.com/cloudflare-one/applications/) called `wildebeest-your-github-user` for you. Now you need to create a [policy](https://developers.cloudflare.com/cloudflare-one/policies/) that defines who can have access to your Wildebeest instance.

Go to https://one.dash.cloudflare.com/access and select your account, then select **_Access / Applications_** and Edit the `wildebeest-your-github-user` application.

![access applications](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/c93d68e8-ddfc-457d-bc63-cc50472e9e00/public)

Now click **_Add a policy_**. Name the policy `wildebeest-policy`, set the action to **_Allow_**, and add an include rule with the list of Emails that you want to allow and then click **_Save policy_**

![access policy](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/f6b1238f-22c3-4daf-6102-7178fc91ca00/public)

### You're ready

Open your browser and go to your newly deployed Wildebeest domain `https://social.example/` (replace social.example with your domain). You should see something like this:

![ready](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/8ffd58d6-6b5b-46c0-af21-ec58a57f1600/public)


Go to `https://social.example/api/v1/instance` (replace social.example with your domain) and double-check your configuration. It should show:

```json
{
	"description": "Private Mastodon Server",
	"email": "admin@social.example",
	"title": "My Wildebeest Server",
	"registrations": false,
	"version": "4.0.2",
	"rules": [],
	"uri": "social.example",
	"short_description": "Private Mastodon Server"
}
```

That's it, you're ready to start using your Wildebeest Mastodon compatible instance.

[Index](../README.md) ┊ [Back](getting-started.md) ┊ [Supported clients](supported-clients.md)
