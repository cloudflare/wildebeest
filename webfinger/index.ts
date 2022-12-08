import { MastodonAccount } from "../types/account";
import { defaultImages } from "../config/accounts"

type WebFingerResponse = {
  links: Array<any>,
};

const headers = {
  "accept": "application/jrd+json",
};

export async function queryAcct(domain: string, acct: string): Promise<MastodonAccount | null> {
  const params = new URLSearchParams({ resource: `acct:${acct}` });
  let res;
  try {
    const url = new URL("/.well-known/webfinger?" + params, "https://" + domain);
    console.log("query", url.href);
    res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`WebFinger API returned: ${res.status}`);
    }
  } catch (err) {
    console.warn("failed to query WebFinger:", err);
    return null;
  }

  const data = await res.json<WebFingerResponse>();
  for (let i = 0, len = data.links.length; i < len; i++) {
    const link = data.links[i];
    if (link.rel === "self" && link.type === "application/activity+json") {
      const headers = {
        "accept": "application/activity+json",
      };
      const res = await fetch(link.href, { headers });
      if (!res.ok) {
        throw new Error(`${link.href} returned: ${res.status}`);
      }

      return toMastodonAccount(acct, await res.json<any>());
    }
  }

  return null;
}

function toMastodonAccount(acct: string, res: any): MastodonAccount {
  let avatar = defaultImages.avatar;
  let header = defaultImages.header;

  if (res.icon !== undefined && typeof res.icon.url === "string") {
    avatar = res.icon.url;
  }
  if (res.image !== undefined && typeof res.image.url === "string") {
    header = res.image.url;
  }

  return {
    acct,

    id: res.id,
    username: res.preferredUsername,
    display_name: res.name,

    avatar,
    avatar_static: avatar,

    header,
    header_static: header,
  }
}
