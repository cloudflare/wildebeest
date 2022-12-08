import type { Env } from "../../../types/env";
import { getPersonById } from "../../../users/";
import { instanceConfig } from "../../../config/instance";

export const onRequest: PagesFunction<Env, any> = async ({ params, request, env }) => {
  return handleRequest(env.DATABASE, params.id as string);
}

const headers = {
  "content-type": "application/jrd+json; charset=utf-8",
};

export async function handleRequest(db: D1Database, id: string): Promise<Response> {
  const person = await getPersonById(db, id);
  if (person === null) {
    return new Response("", { status: 404 });
  }

  const userUrl = `https://${instanceConfig.uri}/ap/user/${id}`;

  const res = {
    ...person.properties,
    "@context": [
      "https://www.w3.org/ns/activitystreams",
    ],
    "type": "Person",
    "preferredUsername": person.id,
    "id": person.id,
    "url": userUrl,
    "following": userUrl + "/following",
    "followers": userUrl + "/followers",
    "inbox": userUrl + "/inbox",
    "outbox": userUrl + "/outbox",
  };
  return new Response(JSON.stringify(res), { status: 200, headers })
}
