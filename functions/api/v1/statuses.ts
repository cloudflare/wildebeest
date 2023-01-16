// https://docs.joinmastodon.org/methods/statuses/#create
import type { Queue, DeliverMessageBody } from 'wildebeest/backend/src/types/queue'
import { loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { createPublicNote } from 'wildebeest/backend/src/activitypub/objects/note'
import type { Document } from 'wildebeest/backend/src/activitypub/objects'
import { getObjectByMastodonId } from 'wildebeest/backend/src/activitypub/objects'
import { getMentions } from 'wildebeest/backend/src/mastodon/status'
import * as activities from 'wildebeest/backend/src/activitypub/activities/create'
import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { queryAcct } from 'wildebeest/backend/src/webfinger'
import { deliverFollowers, deliverToActor } from 'wildebeest/backend/src/activitypub/deliver'
import { addObjectInOutbox } from 'wildebeest/backend/src/activitypub/actors/outbox'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import { readBody } from 'wildebeest/backend/src/utils/body'

type StatusCreate = {
	status: string
	visibility: string
	sensitive: boolean
	media_ids?: Array<string>
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handleRequest(request, env.DATABASE, data.connectedActor, env.userKEK, env.QUEUE)
}

// FIXME: add tests for delivery to followers and mentions to a specific Actor.
export async function handleRequest(
	request: Request,
	db: D1Database,
	connectedActor: Person,
	userKEK: string,
	queue: Queue<DeliverMessageBody>
): Promise<Response> {
	// TODO: implement Idempotency-Key

	if (request.method !== 'POST') {
		return new Response('', { status: 400 })
	}
	const contentType = request.headers.get('content-type')
	console.log({ contentType })

	const body = await readBody<StatusCreate>(request)
	console.log(body)
	if (body.status === undefined || body.visibility === undefined) {
		return new Response('', { status: 400 })
	}

	const mediaAttachments: Array<Document> = []
	if (body.media_ids && body.media_ids.length > 0) {
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

	const domain = new URL(request.url).hostname
	const note = await createPublicNote(domain, db, body.status, connectedActor, mediaAttachments)
	await addObjectInOutbox(db, connectedActor, note)

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

	const account = await loadLocalMastodonAccount(db, connectedActor)

	const res: any = {
		id: note.mastodonId,
		uri: note.id,
		url: new URL('/statuses/' + note.mastodonId, 'https://' + domain),
		created_at: note.published,
		account,
		content: body.status,
		visibility: body.visibility ? body.visibility : 'public',
		emojis: [],
		media_attachments: [],
		tags: [],
		mentions: [],
		spoiler_text: '',
	}
	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type',
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
