[Index](../README.md) ┊ [Back](other-services.md)

## Troubleshooting

Sometimes things go south. The GitHub Actions deployment can fail for some reason, or some configuration changed or was accidentally removed.

### Starting over

If you attempted to deploy Wildebeest in your account and something failed, or you simply want to reinstall everything from scratch again, you need to do manual checkups and cleaning before you start over.

- Go to your zone DNS settings and delete the CNAME record that points to `wildebeest-username.pages.dev`
- Go to your account Pages section and delete the `wildebeest-username` project (make sure you remove the custom domain first if it's been configured).
- Go to your account Workers section and delete the `wildebeest-do` and `wildebeest-consumer-username` workers.
- Go to your account Workers / KV section and delete the `wildebeest-username-cache` and `wildebeest-terraform-username-state` namespaces.
- Go to your account Workers / D1 and delete the `wildebeest-username` database.
- Launch [Zero Trust](https://one.dash.cloudflare.com/), select your account, go to Access / Applications and delete the `wildebeest-username` application.
- Go to https://deploy.workers.cloudflare.com/, open the site settings in your browser and delete all the cookies and local storage data.
- Delete your GitHub wildebeest forked repo.

You can now start a clean install.

### Error 1102

Wildebeest runs cryptographic functions and can process lots of data internally, depending on the size of the instance and social graph. It's possible that, in some cases, a request exceeds the Worker's resource limits in the free plan.

We will keep optimizing our code to run as fast as possible, but if you start seeing 1102 errors when using your Wildebeest pages and APIs, you might need to upgrade to Workers Unbound, which provides much higher limits, as mentioned in the [requirements](requirements.md):

- Go to your **_Account Page_** / **_Pages_**, select the `wildebeest-username` project, go to **_Settings_** / **_Functions_** and change the usage model to **Unbound**.
- Go to your **_Account Page_** / **_Workers_**, select the `wildebeest-do` project, go to **_Settings_** / **_General_** and change the usage model to **Unbound**. Do the same for the `wildebeest-consumer-username` project. Go to **_Account Page_** / **_Workers_** / **_Overview_** again and make sure the Default Usage Model is Unbound.

![unbound](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/45de3429-d01a-4cfc-2ffc-819ac4f51900/public)

After you change your Pages project to Unbound, you need to redeploy it. Go to GitHub Actions in your repo, select the latest successful deploy, and press **Re-run all jobs**.

[Index](../README.md) ┊ [Back](other-services.md)
