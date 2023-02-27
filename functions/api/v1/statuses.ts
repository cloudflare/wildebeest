// https://docs.joinmastodon.org/methods/statuses/#create

import type { Note } from 'wildebeest/backend/src/activitypub/objects/note'
import { cors } from 'wildebeest/backend/src/utils/cors'
import type { APObject } from 'wildebeest/backend/src/activitypub/objects'
import { insertReply } from 'wildebeest/backend/src/mastodon/reply'
import * as timeline from 'wildebeest/backend/src/mastodon/timeline'
import type { Queue, DeliverMessageBody } from 'wildebeest/backend/src/types/queue'
import type { Document } from 'wildebeest/backend/src/activitypub/objects'
import { getObjectByMastodonId } from 'wildebeest/backend/src/activitypub/objects'
import { getMentions } from 'wildebeest/backend/src/mastodon/status'
import { getHashtags, insertHashtags } from 'wildebeest/backend/src/mastodon/hashtag'
import * as activities from 'wildebeest/backend/src/activitypub/activities/create'
import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { deliverFollowers, deliverToActor } from 'wildebeest/backend/src/activitypub/deliver'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import { readBody } from 'wildebeest/backend/src/utils/body'
import * as errors from 'wildebeest/backend/src/errors'
import type { Visibility } from 'wildebeest/backend/src/types'
import { toMastodonStatusFromObject } from 'wildebeest/backend/src/mastodon/status'
import type { Cache } from 'wildebeest/backend/src/cache'
import { cacheFromEnv } from 'wildebeest/backend/src/cache'
import { enrichStatus } from 'wildebeest/backend/src/mastodon/microformats'
import * as idempotency from 'wildebeest/backend/src/mastodon/idempotency'
import { newMention } from 'wildebeest/backend/src/activitypub/objects/mention'
import { originalObjectIdSymbol } from 'wildebeest/backend/src/activitypub/objects'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { createPublicNote, createDirectNote } from 'wildebeest/backend/src/activitypub/objects/note'
import { addObjectInOutbox } from 'wildebeest/backend/src/activitypub/actors/outbox'

type StatusCreate = {
	status: string
	visibility: Visibility
	sensitive: boolean
	media_ids?: Array<string>
	in_reply_to_id?: string
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handleRequest(request, await getDatabase(env), data.connectedActor, env.userKEK, env.QUEUE, cacheFromEnv(env))
}

// FIXME: add tests for delivery to followers and mentions to a specific Actor.
export async function handleRequest(
	request: Request,
	db: Database,
	connectedActor: Person,
	userKEK: string,
	queue: Queue<DeliverMessageBody>,
	cache: Cache
): Promise<Response> {
	if (request.method !== 'POST') {
		return new Response('', { status: 400 })
	}

	const domain = new URL(request.url).hostname
	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}

	const idempotencyKey = request.headers.get('Idempotency-Key')

	if (idempotencyKey !== null) {
		const maybeObject = await idempotency.hasKey(db, idempotencyKey)
		if (maybeObject !== null) {
			const res = await toMastodonStatusFromObject(db, maybeObject as Note, domain)
			return new Response(JSON.stringify(res), { headers })
		}
	}

	const body = await readBody<StatusCreate>(request)
	console.log(body)
	if (body.status === undefined || body.visibility === undefined) {
		return new Response('', { status: 400 })
	}

	if (body.status.length > 500) {
		return errors.validationError('text character limit of 500 exceeded')
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
		extraProperties.inReplyTo = inReplyToObject[originalObjectIdSymbol] || inReplyToObject.id.toString()
	}

	const hashtags = getHashtags(body.status)

	const mentions = await getMentions(body.status, domain, db)
	if (mentions.length > 0) {
		extraProperties.tag = mentions.map(newMention)
	}

	const content = enrichStatus(body.status, mentions)

	let note

	if (body.visibility === 'public') {
		note = await createPublicNote(domain, db, content, connectedActor, mediaAttachments, extraProperties)
	} else if (body.visibility === 'direct') {
		note = await createDirectNote(domain, db, content, connectedActor, mentions, mediaAttachments, extraProperties)
	} else {
		return errors.validationError(`status with visibility: ${body.visibility}`)
	}

	if (hashtags.length > 0) {
		await insertHashtags(db, note, hashtags)
	}

	if (inReplyToObject !== null) {
		// after the status has been created, record the reply.
		await insertReply(db, connectedActor, note, inReplyToObject)
	}

	const activity = activities.create(domain, connectedActor, note)
	await deliverFollowers(db, userKEK, connectedActor, activity, queue)

	if (body.visibility === 'public') {
		await addObjectInOutbox(db, connectedActor, note)

		// A public note is sent to the public group URL and cc'ed any mentioned
		// actors.
		for (let i = 0, len = mentions.length; i < len; i++) {
			const targetActor = mentions[i]
			note.cc.push(targetActor.id.toString())
		}
	} else if (body.visibility === 'direct') {
		//  A direct note is sent to mentioned people only
		for (let i = 0, len = mentions.length; i < len; i++) {
			const targetActor = mentions[i]
			await addObjectInOutbox(db, connectedActor, note, undefined, targetActor.id.toString())
		}
	}

	{
		// If the status is mentioning other persons, we need to delivery it to them.
		for (let i = 0, len = mentions.length; i < len; i++) {
			const targetActor = mentions[i]
			const activity = activities.create(domain, connectedActor, note)
			const signingKey = await getSigningKey(userKEK, db, connectedActor)
			await deliverToActor(signingKey, connectedActor, targetActor, activity, domain)
		}
	}

	if (idempotencyKey !== null) {
		await idempotency.insertKey(db, idempotencyKey, note)
	}

	await timeline.pregenerateTimelines(domain, db, cache, connectedActor)

	const res = await toMastodonStatusFromObject(db, note, domain)
	return new Response(JSON.stringify(res), { headers })
}
