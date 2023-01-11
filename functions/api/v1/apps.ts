import { ContextData } from 'wildebeest/backend/src/types/context'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import { Env } from 'wildebeest/backend/src/types/env'
import { createClient } from 'wildebeest/backend/src/mastodon/client'
import { VAPIDPublicKey } from 'wildebeest/backend/src/mastodon/subscription'
import { getVAPIDKeys } from 'wildebeest/backend/src/config'

type AppsPost = {
	redirect_uris: string
	website: string
	client_name: string
	scopes: string
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env }) => {
	return handleRequest(env.DATABASE, request, getVAPIDKeys(env))
}

export async function handleRequest(db: D1Database, request: Request, vapidKeys: JWK) {
	if (request.method !== 'POST') {
		return new Response('', { status: 400 })
	}

	const body = await request.json<AppsPost>()

	const client = await createClient(db, body.client_name, body.redirect_uris, body.website, body.scopes)
	const vapidKey = VAPIDPublicKey(vapidKeys)

	const res = {
		name: body.client_name,
		website: body.website,
		redirect_uri: body.redirect_uris,

		client_id: client.id,
		client_secret: client.secret,

		vapid_key: vapidKey,
	}
	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type',
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
