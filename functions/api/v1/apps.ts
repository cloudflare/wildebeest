import { ContextData } from 'wildebeest/backend/src/types/context'
import { cors } from 'wildebeest/backend/src/utils/cors'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import type { Env } from 'wildebeest/backend/src/types/env'
import { createClient } from 'wildebeest/backend/src/mastodon/client'
import { VAPIDPublicKey } from 'wildebeest/backend/src/mastodon/subscription'
import { getVAPIDKeys } from 'wildebeest/backend/src/config'
import { readBody } from 'wildebeest/backend/src/utils/body'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

type AppsPost = {
	redirect_uris: string
	website: string
	client_name: string
	scopes: string
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env }) => {
	return handleRequest(getDatabase(env), request, getVAPIDKeys(env))
}

export async function handleRequest(db: Database, request: Request, vapidKeys: JWK) {
	if (request.method !== 'POST') {
		return new Response('', { status: 400 })
	}

	const body: AppsPost = await readBody<AppsPost>(request)

  // Parameter validation according to https://github.com/mastodon/mastodon/blob/main/app/lib/application_extension.rb
  if ((body.client_name === undefined) || (body.client_name?.trim() === '')) {
    return new Response('Unprocessable entity: client_name cannot be an empty string', { status: 422 })
  } else if ((body.client_name?.length > 60)) {
    return new Response('Unprocessable entity: client_name cannot exceed 60 characters', { status: 422 })
  } else if ((body.redirect_uris === undefined) || (body.redirect_uris?.trim() === '')) {
    return new Response('Unprocessable entity: redirect_uris cannot be an empty string', { status: 422 })
  } else if ((body.redirect_uris?.length > 2000)) {
    return new Response('Unprocessable entity: redirect_uris cannot exceed 2000 characters', { status: 422 })
  } else if (body.redirect_uris !== 'urn:ietf:wg:oauth:2.0:oob') {
    try {
      new URL("", body.redirect_uris);
    } catch {
      return new Response('Unprocessable entity: redirect_uris must be a valid URI', { status: 422 })
    }
  }

	const client = await createClient(db, body.client_name, body.redirect_uris, body.website, body.scopes)
	const vapidKey = VAPIDPublicKey(vapidKeys)

	const res = {
		name: body.client_name,
		website: body.website,
		redirect_uri: body.redirect_uris,

		client_id: client.id,
		client_secret: client.secret,

		vapid_key: vapidKey,

		// FIXME: stub value
		id: '20',
	}
	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
