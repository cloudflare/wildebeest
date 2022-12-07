// https://docs.joinmastodon.org/methods/oauth/#authorize

import type { Env } from "../../types/env";
import { ACCESS_CONFIG } from "../_middleware";
import * as access from "../../access/";
import * as user from "../../users/";

// Extract the JWT token sent by Access (running before us).
const extractJWTFromRequest = (request: Request) => request.headers.get("Cf-Access-Jwt-Assertion") || "";

export const onRequest: PagesFunction<Env, any> = async ({ request, env }) => {
  return handleRequest(request, env.DATABASE);
};

export async function handleRequest(request: Request, db: D1Database): Promise<Response> {
  const url = new URL(request.url);

  if (!(
    url.searchParams.has("redirect_uri")
    && url.searchParams.has("response_type")
    && url.searchParams.has("client_id")
  )) {
    return new Response("", { status: 400 });
  }

  const response_type = url.searchParams.get("response_type");
  if (response_type !== "code") {
    return new Response("", { status: 400 });
  }

  const redirect_uri = url.searchParams.get("redirect_uri");
  const scope = url.searchParams.get("scope") || "";

  const jwt = extractJWTFromRequest(request);
  const validator = access.generateValidator({ jwt, ...ACCESS_CONFIG });
  const { payload } = await validator(request);

  const identity = await access.getIdentity({ jwt, domain: ACCESS_CONFIG.domain });
  if (!identity) {
    return new Response("", { status: 401 });
  }

  const person = await user.getPersonByEmail(db, identity.email);
  if (person === null) {
    await user.createPerson(db, identity.email);
  }

  return Response.redirect(redirect_uri + "?code=" + jwt, 307);
};
