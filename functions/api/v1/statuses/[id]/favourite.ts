// https://docs.joinmastodon.org/methods/statuses/#favourite

import type { Env } from 'wildebeest/types/env'
import { parseHandle } from 'wildebeest/utils/parse'
import { getSigningKey } from 'wildebeest/mastodon/account'
import { deliverToActor } from 'wildebeest/activitypub/deliver'
import type { Person } from 'wildebeest/activitypub/actors'
import * as actors from 'wildebeest/activitypub/actors/'
import * as like from 'wildebeest/activitypub/activities/like'
import { getObjectById } from 'wildebeest/activitypub/objects'
import type { ContextData } from 'wildebeest/types/context'
import { queryAcct } from 'wildebeest/webfinger/'
import { toMastodonStatusFromObject } from 'wildebeest/mastodon/status'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data, params }) => {
	return handleRequest(env.DATABASE, params.id as string, data.connectedActor, env.userKEK)
}

export async function handleRequest(
	db: D1Database,
	id: string,
	connectedActor: Person,
	userKEK: string
): Promise<Response> {
	const obj = await getObjectById(db, id)
	if (obj === null || obj.originalActorId === undefined || obj.originalObjectId === undefined) {
		return new Response('', { status: 404 })
	}

	const status = await toMastodonStatusFromObject(db, obj)
	if (status === null) {
		return new Response('', { status: 404 })
	}

	const targetActor = await actors.get(obj.originalActorId)
	if (!targetActor) {
		return new Response(`target Actor ${obj.originalActorId} not found`, { status: 404 })
	}

	const activity = like.create(connectedActor, new URL(obj.originalObjectId))
	const signingKey = await getSigningKey(userKEK, db, connectedActor)
	await deliverToActor(signingKey, connectedActor, targetActor, activity)

	const headers = {
		'content-type': 'application/json; charset=utf-8',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
	}
	return new Response(JSON.stringify(status), { headers })
}
