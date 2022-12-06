// https://docs.joinmastodon.org/methods/accounts/#verify_credentials

import type { PluginData } from "@cloudflare/pages-plugin-cloudflare-access";

export const onRequest: PagesFunction<unknown, any, PluginData> = async ({ data }) => {
  const identity = await data.cloudflareAccess.JWT.getIdentity();
  if (!identity) {
    return new Response("", { status: 401 });
  }

  const res = {
    "id": "109440052394327266",
    "username": identity.email.replace("@", "_").replace(".", "_"),
    "acct": identity.email.replace("@", "_").replace(".", "_"),
    "display_name": identity.email,
    "locked": false,
    "bot": false,
    "discoverable": false,
    "group": false,
    "created_at": "2022-12-01T00:00:00.000Z",
    "note": "",
    "url": "https://social.that-test.site/@sven2",
    "avatar": "https://jpeg.speedcf.com/cat/23.jpg",
    "avatar_static": "https://jpeg.speedcf.com/cat/23.jpg",
    "header": "https://jpeg.speedcf.com/cat/22.jpg",
    "header_static": "https://jpeg.speedcf.com/cat/22.jpg",
    "followers_count": 0,
    "following_count": 0,
    "statuses_count": 3,
    "last_status_at": "2022-12-05",
    "noindex": false,
    "emojis": [],
    "fields": []
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "content-type": "application/json; charset=utf-8",
  };
  return new Response(JSON.stringify(res), { headers });
};
