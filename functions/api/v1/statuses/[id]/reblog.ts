// https://docs.joinmastodon.org/methods/statuses/#boost
import type { Queue, DeliverMessageBody } from 'wildebeest/backend/src/types/queue'
import { cors } from 'wildebeest/backend/src/utils/cors'
import type { Env } from 'wildebeest/backend/src/types/env'
import { createReblog } from 'wildebeest/backend/src/mastodon/reblog'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import { deliverToActor, deliverFollowers } from 'wildebeest/backend/src/activitypub/deliver'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import * as announce from 'wildebeest/backend/src/activitypub/activities/announce'
import { getObjectByMastodonId } from 'wildebeest/backend/src/activitypub/objects'
import type { Note } from 'wildebeest/backend/src/activitypub/objects/note'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { toMastodonStatusFromObject } from 'wildebeest/backend/src/mastodon/status'
import { originalActorIdSymbol, originalObjectIdSymbol } from 'wildebeest/backend/src/activitypub/objects'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ env, data, params, request }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(await getDatabase(env), params.id as string, data.connectedActor, env.userKEK, env.QUEUE, domain)
}

export async function handleRequest(
	db: Database,
	id: string,
	connectedActor: Person,
	userKEK: string,
	queue: Queue<DeliverMessageBody>,
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
		// Rebloggin an external object delivers the announce activity to the
		// post author.
		const targetActor = await actors.getAndCache(new URL(obj[originalActorIdSymbol]), db)
		if (!targetActor) {
			return new Response(`target Actor ${obj[originalActorIdSymbol]} not found`, { status: 404 })
		}

		const activity = announce.create(connectedActor, new URL(obj[originalObjectIdSymbol]))
		const signingKey = await getSigningKey(userKEK, db, connectedActor)

		await Promise.all([
			// Delivers the announce activity to the post author.
			deliverToActor(signingKey, connectedActor, targetActor, activity, domain),
			// Share reblogged by delivering the announce activity to followers
			deliverFollowers(db, userKEK, connectedActor, activity, queue),
		])
	}

	await createReblog(db, connectedActor, obj)
	status.reblogged = true

	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(status), { headers })
}
