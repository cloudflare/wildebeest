// https://docs.joinmastodon.org/methods/statuses/#create

import { cors } from 'wildebeest/backend/src/utils/cors'
import type { APObject } from 'wildebeest/backend/src/activitypub/objects'
import { insertReply } from 'wildebeest/backend/src/mastodon/reply'
import * as timeline from 'wildebeest/backend/src/mastodon/timeline'
import type { Queue, DeliverMessageBody } from 'wildebeest/backend/src/types/queue'
import type { Document } from 'wildebeest/backend/src/activitypub/objects'
import { getObjectByMastodonId } from 'wildebeest/backend/src/activitypub/objects'
import { createStatus, getMentions } from 'wildebeest/backend/src/mastodon/status'
import * as activities from 'wildebeest/backend/src/activitypub/activities/create'
import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { queryAcct } from 'wildebeest/backend/src/webfinger'
import { deliverFollowers, deliverToActor } from 'wildebeest/backend/src/activitypub/deliver'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import { readBody } from 'wildebeest/backend/src/utils/body'
import * as errors from 'wildebeest/backend/src/errors'
import type { Visibility } from 'wildebeest/backend/src/types'
import { toMastodonStatusFromObject } from 'wildebeest/backend/src/mastodon/status'
import type { Cache } from 'wildebeest/backend/src/cache'
import { cacheFromEnv } from 'wildebeest/backend/src/cache'

type StatusCreate = {
	status: string
	visibility: Visibility
	sensitive: boolean
	media_ids?: Array<string>
	in_reply_to_id?: string
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handleRequest(request, env.DATABASE, data.connectedActor, env.userKEK, env.QUEUE, cacheFromEnv(env))
}

// FIXME: add tests for delivery to followers and mentions to a specific Actor.
export async function handleRequest(
	request: Request,
	db: D1Database,
	connectedActor: Person,
	userKEK: string,
	queue: Queue<DeliverMessageBody>,
	cache: Cache
): Promise<Response> {
	// TODO: implement Idempotency-Key

	if (request.method !== 'POST') {
		return new Response('', { status: 400 })
	}

	const body = await readBody<StatusCreate>(request)
	console.log(body)
	if (body.status === undefined || body.visibility === undefined) {
		return new Response('', { status: 400 })
	}

	const mediaAttachments: Array<Document> = []
	if (body.media_ids && body.media_ids.length > 0) {
		if (body.media_ids.length > 4) {
			return errors.exceededLimit('up to 4 images are allowed')
		}

		for (let i = 0, len = body.media_ids.length; i < len; i++) {
			const id = body.media_ids[i]
			const document = await getObjectByMastodonId(db, id)
			if (document === null) {
				console.warn('object attachement not found: ' + id)
				continue
			}
			mediaAttachments.push(document)
		}
	}

	let inReplyToObject: APObject | null = null

	if (body.in_reply_to_id) {
		inReplyToObject = await getObjectByMastodonId(db, body.in_reply_to_id)
		if (inReplyToObject === null) {
			return errors.statusNotFound(body.in_reply_to_id)
		}
	}

	const extraProperties: any = {}
	if (inReplyToObject !== null) {
		extraProperties.inReplyTo = inReplyToObject.id.toString()
	}

	const domain = new URL(request.url).hostname
	const note = await createStatus(domain, db, connectedActor, body.status, mediaAttachments, extraProperties)

	if (inReplyToObject !== null) {
		// after the status has been created, record the reply.
		await insertReply(db, connectedActor, note, inReplyToObject)
	}

	const activity = activities.create(domain, connectedActor, note)
	await deliverFollowers(db, userKEK, connectedActor, activity, queue)

	{
		// If the status is mentioning other persons, we need to delivery it to them.
		const mentions = getMentions(body.status)
		for (let i = 0, len = mentions.length; i < len; i++) {
			if (mentions[i].domain === null) {
				// Only deliver the note for remote actors
				continue
			}
			const acct = `${mentions[i].localPart}@${mentions[i].domain}`
			const targetActor = await queryAcct(mentions[i].domain!, acct)
			if (targetActor === null) {
				console.warn(`actor ${acct} not found`)
				continue
			}
			note.to.push(targetActor.id.toString())
			const activity = activities.create(domain, connectedActor, note)
			const signingKey = await getSigningKey(userKEK, db, connectedActor)
			await deliverToActor(signingKey, connectedActor, targetActor, activity)
		}
	}

	await timeline.pregenerateTimelines(domain, db, cache, connectedActor)

	const res = await toMastodonStatusFromObject(db, note, domain)
	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
