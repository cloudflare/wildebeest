// https://docs.joinmastodon.org/methods/statuses/#favourite

import type { Env } from 'wildebeest/backend/src/types/env'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import { deliverToActor } from 'wildebeest/backend/src/activitypub/deliver'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import * as like from 'wildebeest/backend/src/activitypub/activities/like'
import { getObjectByMastodonId } from 'wildebeest/backend/src/activitypub/objects'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { queryAcct } from 'wildebeest/backend/src/webfinger'
import { toMastodonStatusFromObject } from 'wildebeest/backend/src/mastodon/status'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data, params }) => {
	return handleRequest(env.DATABASE, params.id as string, data.connectedActor, env.userKEK)
}

export async function handleRequest(
	db: D1Database,
	id: string,
	connectedActor: Person,
	userKEK: string
): Promise<Response> {
	const obj = await getObjectByMastodonId(db, id)
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
