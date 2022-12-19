# Wildebeest

## Getting started

Install:

```sh
yarn
```

## Running tests

```sh
yarn test
```

## Debugging locally

```sh
yarn dev
```

If only working on the REST API endpoints this is sufficient.
Any changes to the `functions` directory and the files it imports will re-run the Pages build.

Changes to the UI code will not trigger a rebuild automatically.
To do so, run the following in second terminal:

```sh
yarn --cwd ui watch
```
