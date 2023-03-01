// https://docs.joinmastodon.org/methods/statuses/#favourite

import type { Env } from 'wildebeest/backend/src/types/env'
import { cors } from 'wildebeest/backend/src/utils/cors'
import { insertLike } from 'wildebeest/backend/src/mastodon/like'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import { deliverToActor } from 'wildebeest/backend/src/activitypub/deliver'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import * as like from 'wildebeest/backend/src/activitypub/activities/like'
import { getObjectByMastodonId } from 'wildebeest/backend/src/activitypub/objects'
import type { Note } from 'wildebeest/backend/src/activitypub/objects/note'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { toMastodonStatusFromObject } from 'wildebeest/backend/src/mastodon/status'
import { originalObjectIdSymbol, originalActorIdSymbol } from 'wildebeest/backend/src/activitypub/objects'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ env, data, params, request }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(await getDatabase(env), params.id as string, data.connectedActor, env.userKEK, domain)
}

export async function handleRequest(
	db: Database,
	id: string,
	connectedActor: Person,
	userKEK: string,
	domain: string
): Promise<Response> {
	const obj = await getObjectByMastodonId(db, id)
	if (obj === null) {
		return new Response('', { status: 404 })
	}

	const status = await toMastodonStatusFromObject(db, obj as Note, domain)
	if (status === null) {
		return new Response('', { status: 404 })
	}

	if (obj[originalObjectIdSymbol] && obj[originalActorIdSymbol]) {
		// Liking an external object delivers the like activity
		const targetActor = await actors.getAndCache(new URL(obj[originalActorIdSymbol]), db)
		if (!targetActor) {
			return new Response(`target Actor ${obj[originalActorIdSymbol]} not found`, { status: 404 })
		}

		const activity = like.create(connectedActor, new URL(obj[originalObjectIdSymbol]))
		const signingKey = await getSigningKey(userKEK, db, connectedActor)
		await deliverToActor(signingKey, connectedActor, targetActor, activity, domain)
	}

	await insertLike(db, connectedActor, obj)
	status.favourited = true

	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(status), { headers })
}
