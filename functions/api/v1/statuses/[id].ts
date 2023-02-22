// https://docs.joinmastodon.org/methods/statuses/#get

import type { Cache } from 'wildebeest/backend/src/cache'
import { type Note } from 'wildebeest/backend/src/activitypub/objects/note'
import * as activities from 'wildebeest/backend/src/activitypub/activities/delete'
import { cors } from 'wildebeest/backend/src/utils/cors'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import type { UUID } from 'wildebeest/backend/src/types'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { getMastodonStatusById, toMastodonStatusFromObject } from 'wildebeest/backend/src/mastodon/status'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as errors from 'wildebeest/backend/src/errors'
import { getObjectByMastodonId, deleteObject } from 'wildebeest/backend/src/activitypub/objects'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import { deliverFollowers } from 'wildebeest/backend/src/activitypub/deliver'
import type { Queue, DeliverMessageBody } from 'wildebeest/backend/src/types/queue'
import * as timeline from 'wildebeest/backend/src/mastodon/timeline'
import { cacheFromEnv } from 'wildebeest/backend/src/cache'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ params, env, request, data }) => {
	const domain = new URL(request.url).hostname
	return handleRequestGet(await getDatabase(env), params.id as UUID, domain, data.connectedActor)
}

export const onRequestDelete: PagesFunction<Env, any, ContextData> = async ({ params, env, request, data }) => {
	const domain = new URL(request.url).hostname
	return handleRequestDelete(
		await getDatabase(env),
		params.id as UUID,
		data.connectedActor,
		domain,
		env.userKEK,
		env.QUEUE,
		cacheFromEnv(env)
	)
}

export async function handleRequestGet(
	db: Database,
	id: UUID,
	domain: string,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- To be used when we implement private statuses
	connectedActor: Person
): Promise<Response> {
	const status = await getMastodonStatusById(db, id, domain)
	if (status === null) {
		return new Response('', { status: 404 })
	}

	// future validation for private statuses
	/*
	if (status.private && status.account.id !== urlToHandle(connectedActor.id)) {
		return errors.notAuthorized("status is private");
	}
	*/

	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(status), { headers })
}

export async function handleRequestDelete(
	db: Database,
	id: UUID,
	connectedActor: Person,
	domain: string,
	userKEK: string,
	queue: Queue<DeliverMessageBody>,
	cache: Cache
): Promise<Response> {
	const obj = (await getObjectByMastodonId(db, id)) as Note
	if (obj === null) {
		return errors.statusNotFound(id)
	}

	const status = await toMastodonStatusFromObject(db, obj, domain)
	if (status === null) {
		return errors.statusNotFound(id)
	}
	if (status.account.id !== urlToHandle(connectedActor.id)) {
		return errors.statusNotFound(id)
	}

	await deleteObject(db, obj)

	// FIXME: deliver a Delete message to our peers
	const activity = activities.create(domain, connectedActor, obj)
	await deliverFollowers(db, userKEK, connectedActor, activity, queue)

	await timeline.pregenerateTimelines(domain, db, cache, connectedActor)

	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(status), { headers })
}
