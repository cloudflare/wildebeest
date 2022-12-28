// https://docs.joinmastodon.org/methods/statuses/#boost

import type { Env } from 'wildebeest/backend/src/types/env'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { addObjectInOutbox } from 'wildebeest/backend/src/activitypub/actors/outbox'
import { insertReblog } from 'wildebeest/backend/src/mastodon/reblog'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import { deliverToActor, deliverFollowers } from 'wildebeest/backend/src/activitypub/deliver'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import * as announce from 'wildebeest/backend/src/activitypub/activities/announce'
import { getObjectByMastodonId } from 'wildebeest/backend/src/activitypub/objects'
import type { Note } from 'wildebeest/backend/src/activitypub/objects/note'
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
	if (obj === null) {
		return new Response('', { status: 404 })
	}

	const status = await toMastodonStatusFromObject(db, obj as Note)
	if (status === null) {
		return new Response('', { status: 404 })
	}

	const signingKey = await getSigningKey(userKEK, db, connectedActor)

	if (obj.originalObjectId && obj.originalActorId) {
		// Rebloggin an external object delivers the announce activity to the
		// post author.
		const targetActor = await actors.get(obj.originalActorId)
		if (!targetActor) {
			return new Response(`target Actor ${obj.originalActorId} not found`, { status: 404 })
		}

		const activity = announce.create(connectedActor, new URL(obj.originalObjectId))

		await Promise.all([
			// Delivers the announce activity to the post author.
			deliverToActor(signingKey, connectedActor, targetActor, activity),
			// Share reblogged by delivering the announce activity to followers
			deliverFollowers(db, signingKey, connectedActor, activity),
		])
	}

	await Promise.all([addObjectInOutbox(db, connectedActor, obj), insertReblog(db, connectedActor, obj)])
	status.reblogged = true

	const headers = {
		'content-type': 'application/json; charset=utf-8',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
	}
	return new Response(JSON.stringify(status), { headers })
}
