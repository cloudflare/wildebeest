import * as access from "wildebeest/access/";
import { accessConfig } from "wildebeest/config/access";

async function errorHandling(context: EventContext<unknown, any, any>) {
  try {
    return await context.next();
  } catch (err: any) {
    console.log(err.stack);
    return new Response(`${err.message}\n${err.stack}`, { status: 500 });
  }
}

async function logger(context: EventContext<unknown, any, any>) {
  const { method, url } = context.request;
  console.log(`-> ${method} ${url}`);
  const res = await context.next();
  console.log(`<- ${res.status}`);

  return res;
}

async function main(context: EventContext<unknown, any, any>) {
  if (context.request.method === "OPTIONS") {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type, authorization",
      "content-type": "application/json",
    };
    return new Response("", { headers });
  }

  const url = new URL(context.request.url);
  if (
    url.pathname === "/oauth/token"
    || url.pathname === "/oauth/authorize" // Cloudflare Access runs on /oauth/authorize
    || url.pathname === "/api/v1/instance"
    || url.pathname === "/api/v1/apps"
    || url.pathname === "/.well-known/webfinger"
    || url.pathname.startsWith("/ap/") // all ActivityPub endpoints
  ) {
    return context.next();
  } else {
    try {
      const authorization = context.request.headers.get("Authorization") || "";
      const jwt = authorization.replace("Bearer ", "");

      const validator = access.generateValidator({ jwt, ...accessConfig });
      const { payload } = await validator(context.request);

      context.data.cloudflareAccess = {
        JWT: {
          payload,
          getIdentity: () => access.getIdentity({ jwt, domain: accessConfig.domain }),
        },
      };

      return context.next();
    } catch {}

    return new Response(null, {
      status: 302,
      headers: {
        Location: access.generateLoginURL({ redirectURL: context.request.url, domain: accessConfig.domain, aud: accessConfig.aud }),
      },
    });
  }
}

export const onRequest = [logger, errorHandling, main];
