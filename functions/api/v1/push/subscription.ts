import { getClientById } from 'wildebeest/backend/src/mastodon/client'
import { cors } from 'wildebeest/backend/src/utils/cors'
import { getVAPIDKeys } from 'wildebeest/backend/src/config'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { createSubscription, getSubscription } from 'wildebeest/backend/src/mastodon/subscription'
import type { CreateRequest } from 'wildebeest/backend/src/mastodon/subscription'
import { ContextData } from 'wildebeest/backend/src/types/context'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as errors from 'wildebeest/backend/src/errors'
import { VAPIDPublicKey } from 'wildebeest/backend/src/mastodon/subscription'

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handleGetRequest(env.DATABASE, request, data.connectedActor, data.clientId, getVAPIDKeys(env))
}

export const onRequestPost: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handlePostRequest(env.DATABASE, request, data.connectedActor, data.clientId, getVAPIDKeys(env))
}

const headers = {
	...cors(),
	'content-type': 'application/json; charset=utf-8',
}

export async function handleGetRequest(
	db: D1Database,
	request: Request,
	connectedActor: Actor,
	clientId: string,
	vapidKeys: JWK
) {
	const client = await getClientById(db, clientId)
	if (client === null) {
		return errors.clientUnknown()
	}

	const subscription = await getSubscription(db, connectedActor, client)

	if (subscription === null) {
		return new Response('', { status: 404 })
	}

	const vapidKey = VAPIDPublicKey(vapidKeys)

	const res = {
		id: subscription.id,
		endpoint: subscription.gateway.endpoint,
		alerts: subscription.alerts,
		policy: subscription.policy,
		server_key: vapidKey,
	}

	return new Response(JSON.stringify(res), { headers })
}

export async function handlePostRequest(
	db: D1Database,
	request: Request,
	connectedActor: Actor,
	clientId: string,
	vapidKeys: JWK
) {
	const client = await getClientById(db, clientId)
	if (client === null) {
		return errors.clientUnknown()
	}

	const data = await request.json<CreateRequest>()

	let subscription = await getSubscription(db, connectedActor, client)

	if (subscription === null) {
		subscription = await createSubscription(db, connectedActor, client, data)
	}

	const vapidKey = VAPIDPublicKey(vapidKeys)

	const res = {
		id: subscription.id,
		endpoint: subscription.gateway.endpoint,
		alerts: subscription.alerts,
		policy: subscription.policy,
		server_key: vapidKey,
	}

	return new Response(JSON.stringify(res), { headers })
}
