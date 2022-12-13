// https://docs.joinmastodon.org/methods/accounts/#relationships

import type { PluginData } from "@cloudflare/pages-plugin-cloudflare-access";
import type { Env } from "wildebeest/types/env";
import type { MastodonAccount } from "wildebeest/types/account";

export const onRequest: PagesFunction<Env, any> = async ({ request }) => {
  return handleRequest(request);
};

export function handleRequest(req: Request): Response {
  const url = new URL(req.url);

  let ids = [];
  if (url.searchParams.has("id")) {
    ids.push(url.searchParams.get("id"));
  }

  if (url.searchParams.has("id[]")) {
    ids = url.searchParams.getAll("id[]");
  }

  if (ids.length === 0) {
    return new Response("", { status: 400 });
  }

  const res = [];

  for (let i = 0, len = ids.length; i < len; i++) {
    res.push({
      id: ids[i],
      following: false,
      showing_reblogs: false,
      notifying: false,
      followed_by: false,
      blocking: false,
      blocked_by: false,
      muting: false,
      muting_notifications: false,
      requested: false,
      domain_blocking: false,
      endorsed: false
    });
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "content-type": "application/json; charset=utf-8",
  };
  return new Response(JSON.stringify(res), { headers });
}
