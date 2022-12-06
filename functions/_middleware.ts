import cloudflareAccessPlugin from "@cloudflare/pages-plugin-cloudflare-access";

const authentication: PagesFunction = cloudflareAccessPlugin({
  domain: "https://that-test.cloudflareaccess.com",
  aud: "b45b16274a1a212b95cbc6081035c5c761c8122969323f1644cafdcd0b27355e",
});

async function errorHandling(context: EventContext<unknown, any, any>) {
  try {
    return await context.next();
  } catch (err: any) {
    console.log(err.stack);
    return new Response(`${err.message}\n${err.stack}`, { status: 500 });
  }
}

export const onRequest = [errorHandling, authentication];
