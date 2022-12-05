# Contribute to Wildebeest

## Getting started

Install:

```sh
yarn
```

## Running tests

Run the API (backend) unit tests:

```sh
yarn test
```

Run the UI (frontend) integration tests:

```sh
yarn database:create-mock # this initializes a local test database
yarn test:ui
```

## Debugging locally

```sh
yarn database:create-mock # this initializes a local test database
yarn dev
```

If only working on the REST API endpoints this is sufficient.
Any changes to the `functions` directory and the files it imports will re-run the Pages build.

Changes to the UI code will not trigger a rebuild automatically.
To do so, run the following in second terminal:

```sh
yarn --cwd frontend watch
```

## Deploying

This is a Cloudflare Pages project and can be deployed directly from the command line using Wrangler.

First you must create and configure the Pages project and bindings (D1 database, KV namespace, etc).

### Initialization

Run the following command to create the Pages project and the D1 database in your account.

```
yarn deploy:init
```

You should see output like:

```
✅ Successfully created DB 'wildebeest'!

Add the following to your wrangler.toml to connect to it from a Worker:

[[ d1_databases ]]
binding = "DB" # i.e. available in your Worker on env.DB
database_name = "wildebeest"
database_id = "ddce04a1-fd51-40cb-be21-e899d70fb9f3"
```

Grab the database_id from the command line output and add it to the wrangler.toml file. Don't change the binding name in the wrangler.toml. It should stay as `DATABASE`.

Next go to the Pages dashboard and add the D1 database to the newly created Pages project. This can be found at

```
wildebeest->Settings->Functions->D1 database bindings->Add binding
```

Enter `DATABASE` for the variable name and select the `wildebeest` database from the dropdown.

### Environment variables

wildebeest expectes the Pages project to inject the following environment variables.

Secret used to encrypt user private key in the database:
- `USER_KEY`

API token for integration with Cloudflare services (Cloudflare Images for example):
- `CF_ACCOUNT_ID`
- `CF_API_TOKEN`

### Deployment

Run the following command to deploy the current working directory to Cloudflare Pages:

```
yarn deploy
```
