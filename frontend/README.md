# Wildebeest UI

This directory contains a website that server-side renders a readonly public view of the data available via the REST APIs of the server.

The site is built using the Qwik framework, which consists of client-side JavaScript code, static assets and a server-side Cloudflare Pages Function to do the server-side rendering.

In the top level of the repository run the following to build the app and host the whole server:

```
yarn dev
```

If you make a change to the Qwik application, you can open a new terminal and run the following to regenerate the website code:

```
yarn --cwd ui build
```
