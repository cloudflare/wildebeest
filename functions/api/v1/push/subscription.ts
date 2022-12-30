import { getClientById } from 'wildebeest/backend/src/mastodon/client'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { createSubscription, getSubscription } from 'wildebeest/backend/src/mastodon/subscription'
import type { CreateRequest } from 'wildebeest/backend/src/mastodon/subscription'
import { ContextData } from 'wildebeest/backend/src/types/context'
import { Env } from 'wildebeest/backend/src/types/env'
import * as errors from 'wildebeest/backend/src/errors'

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handleGetRequest(env.DATABASE, request, data.connectedActor, data.clientId)
}

export const onRequestPost: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handlePostRequest(env.DATABASE, request, data.connectedActor, data.clientId)
}

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type, authorization',
	'content-type': 'application/json; charset=utf-8',
}

export async function handleGetRequest(db: D1Database, request: Request, connectedActor: Actor, clientId: string) {
	const client = await getClientById(db, clientId)
	if (client === null) {
		return errors.clientUnknown()
	}

	const subscription = await getSubscription(db, connectedActor, client)

	if (subscription === null) {
		return new Response('', { status: 404 })
	}

	const res = {
		id: 4,
		endpoint: subscription.endpoint,
		alerts: {
			follow: true,
			favourite: true,
			reblog: true,
			mention: true,
			poll: true,
		},
		policy: 'all',

		// FIXME: stub value
		server_key: 'TODO',
	}

	return new Response(JSON.stringify(res), { headers })
}

export async function handlePostRequest(db: D1Database, request: Request, connectedActor: Actor, clientId: string) {
	const client = await getClientById(db, clientId)
	if (client === null) {
		return errors.clientUnknown()
	}

	const data = await request.json<CreateRequest>()

	let subscription = await getSubscription(db, connectedActor, client)
	if (subscription === null) {
		subscription = await createSubscription(db, connectedActor, client, data)
	}

	const res = {
		id: 4,
		endpoint: data.subscription.endpoint,
		alerts: {
			follow: true,
			favourite: true,
			reblog: true,
			mention: true,
			poll: true,
		},
		policy: 'all',

		// FIXME: stub value
		server_key: 'TODO',
	}
	return new Response(JSON.stringify(res), { headers })
}
