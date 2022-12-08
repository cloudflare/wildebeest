// https://docs.joinmastodon.org/methods/accounts/#get

import type { Env } from "../../../../types/env";
import type { MastodonAccount } from "../../../../types/account";
import { parseHandle } from "../../../../utils/parse"
import { queryAcct } from "../../../../webfinger/index"

const headers = {
  "content-type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

export const onRequest: PagesFunction<Env, any> = async ({ params }) => {
  return handleRequest(params.id as string);
};

export async function handleRequest(id: string): Promise<Response> {
  const handle = parseHandle(id);

  if (handle.domain === null) {
    // FIXME: only remote users are supported at the moment.
    return new Response("", { status: 404 })
  }

  // TODO: using webfinger isn't the optimal implemnetation. We could cache
  // the object in D1 and directly query the remote API, indicated by the actor's
  // url field. For now, let's keep it simple.
  const acct = await queryAcct(handle.domain, `${handle.localPart}@${handle.domain}`);
  if (acct === null) {
    return new Response("", { status: 404 })
  }

  return new Response(JSON.stringify(acct), { headers });
}
