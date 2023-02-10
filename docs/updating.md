[Index](../README.md) ┊ [Back](supported-clients.md) ┊ [Other Cloudflare services](other-services.md)

## Updating Wildebeest

The deployment workflow runs automatically every time the main branch changes, so updating the Wildebeest is as easy as synchronizing the upstream official repository with the fork. You don't even need to use git commands for that; GitHub provides a convenient **_Sync fork_** button in the UI that you can simply click.

![configuration screen](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/92ddc9f2-789b-454d-f6ca-2e9011613900/w=500)

Once your fork is synchronized with the official repo, the GitHub Actions workflow is triggered and a new build will be deployed.

Updates are incremental and non-destructive. When the GitHub Actions workflow redeploys Wildebeest, we only make the necessary changes to your configuration and nothing else. You don't lose your data; we don't need to delete your existing configurations.

Data loss is not a problem either because D1 supports migrations. If we need to add a new column to a table or a new table, we don't need to destroy the database and create it again; we just apply the necessary SQL to that change.

![first login](https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/51a4767c-5d3d-4075-d17d-b8112432ca00/w=850)

[Index](../README.md) ┊ [Back](supported-clients.md) ┊ [Other Cloudflare services](other-services.md)
