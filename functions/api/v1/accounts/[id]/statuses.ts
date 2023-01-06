import type { Env } from 'wildebeest/backend/src/types/env'
import type { Note } from 'wildebeest/backend/src/activitypub/objects/note'
import { loadExternalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import type { Object } from 'wildebeest/backend/src/activitypub/objects'
import { getPersonById } from 'wildebeest/backend/src/activitypub/actors'
import { makeGetActorAsId, makeGetObjectAsId } from 'wildebeest/backend/src/activitypub/activities/handle'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import type { Handle } from 'wildebeest/backend/src/utils/parse'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { MastodonAccount, MastodonStatus } from 'wildebeest/backend/src/types'
import { toMastodonStatusFromObject } from 'wildebeest/backend/src/mastodon/status'
import * as objects from 'wildebeest/backend/src/activitypub/objects'
import { actorURL } from 'wildebeest/backend/src/activitypub/actors'
import * as webfinger from 'wildebeest/backend/src/webfinger'
import * as outbox from 'wildebeest/backend/src/activitypub/actors/outbox'
import * as actors from 'wildebeest/backend/src/activitypub/actors'

const headers = {
	'content-type': 'application/json; charset=utf-8',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type, authorization',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params }) => {
	return handleRequest(request, env.DATABASE, params.id as string, env.userKEK)
}

export async function handleRequest(request: Request, db: D1Database, id: string, userKEK: string): Promise<Response> {
	const handle = parseHandle(id)
	const domain = new URL(request.url).hostname

	if (handle.domain === null || (handle.domain !== null && handle.domain === domain)) {
		// Retrieve the statuses from a local user
		return getLocalStatuses(request, db, handle)
	} else if (handle.domain !== null) {
		// Retrieve the statuses of a remote actor
		return getRemoteStatuses(request, handle, db, userKEK)
	} else {
		return new Response('', { status: 403 })
	}
}

async function getRemoteStatuses(request: Request, handle: Handle, db: D1Database, userKEK: string): Promise<Response> {
	const url = new URL(request.url)
	const domain = url.hostname
	const isPinned = url.searchParams.get('pinned') === 'true'
	if (isPinned) {
		// TODO: pinned statuses are not implemented yet. Stub the endpoint
		// to avoid returning statuses that aren't pinned.
		return new Response(JSON.stringify([]), { headers })
	}

	const acct = `${handle.localPart}@${handle.domain}`
	const link = await webfinger.queryAcctLink(handle.domain!, acct)
	if (link === null) {
		return new Response('', { status: 404 })
	}

	const actor = await actors.getAndCache(link, db)

	const activities = await outbox.get(actor)
	let statuses: Array<MastodonStatus> = []

	const account = await loadExternalMastodonAccount(acct, actor)

	for (let i = 0, len = activities.items.length; i < len; i++) {
		const activity = activities.items[i]

		const getObjectAsId = makeGetObjectAsId(activity)
		const getActorAsId = makeGetActorAsId(activity)

		if (activity.type === 'Create') {
			const actorId = getActorAsId()
			const originalObjectId = getObjectAsId()
			const res = await objects.cacheObject(domain, db, activity.object, actorId, originalObjectId, false)
			const status = await toMastodonStatusFromObject(db, res.object as Note)
			if (status !== null) {
				statuses.push(status)
			}
		}

		if (activity.type === 'Announce') {
			let obj: any

			const actorId = getActorAsId()
			const objectId = getObjectAsId()

			const localObject = await objects.getObjectById(db, objectId)
			if (localObject === null) {
				try {
					// Object doesn't exists locally, we'll need to download it.
					const remoteObject = await objects.get<Note>(objectId)

					const res = await objects.cacheObject(domain, db, remoteObject, actorId, objectId, false)
					if (res === null) {
						break
					}
					obj = res.object
				} catch (err: any) {
					console.warn(`failed to retrieve object ${objectId}: ${err.message}`)
					break
				}
			} else {
				// Object already exists locally, we can just use it.
				obj = localObject
			}

			const status = await toMastodonStatusFromObject(db, obj)
			if (status !== null) {
				statuses.push(status)
			}
		}

		// FIXME: support other Activities, like Update.
	}

	return new Response(JSON.stringify(statuses), { headers })
}

async function getLocalStatuses(request: Request, db: D1Database, handle: Handle): Promise<Response> {
	const domain = new URL(request.url).hostname
	const actorId = actorURL(domain, handle.localPart)

	const QUERY = `
SELECT objects.*,
       (SELECT count(*) FROM actor_favourites WHERE actor_favourites.object_id=objects.id) as favourites_count,
       (SELECT count(*) FROM actor_reblogs WHERE actor_reblogs.object_id=objects.id) as reblogs_count
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
WHERE outbox_objects.actor_id = ? AND outbox_objects.cdate > ? AND objects.type = 'Note'
ORDER by outbox_objects.cdate DESC
LIMIT ?
`

	const DEFAULT_LIMIT = 20

	const out: Array<MastodonStatus> = []

	const url = new URL(request.url)

	const isPinned = url.searchParams.get('pinned') === 'true'
	if (isPinned) {
		// TODO: pinned statuses are not implemented yet. Stub the endpoint
		// to avoid returning statuses that aren't pinned.
		return new Response(JSON.stringify(out), { headers })
	}

	let afterCdate = '00-00-00 00:00:00'
	if (url.searchParams.has('max_id')) {
		// Client asked to retrieve statuses after the max_id
		// As opposed to Mastodon we don't use incremental ID but UUID, we need
		// to retrieve the cdate of the max_id row and only show the newer statuses.
		const maxId = url.searchParams.get('max_id')

		const row: any = await db.prepare('SELECT cdate FROM outbox_objects WHERE object_id=?').bind(maxId).first()
		afterCdate = row.cdate
	}

	const { success, error, results } = await db.prepare(QUERY).bind(actorId.toString(), afterCdate, DEFAULT_LIMIT).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	if (results && results.length > 0) {
		for (let i = 0, len = results.length; i < len; i++) {
			const result: any = results[i]
			const properties = JSON.parse(result.properties)

			const author = await getPersonById(db, actorId)
			if (author === null) {
				console.error('note author is unknown')
				continue
			}

			const acct = `${author.preferredUsername}@${domain}`
			const account = await loadExternalMastodonAccount(acct, author)

			out.push({
				id: result.id,
				uri: objects.uri(domain, result.id),
				created_at: new Date(result.cdate).toISOString(),
				content: properties.content,
				emojis: [],
				media_attachments: [],
				tags: [],
				mentions: [],
				account,
				favourites_count: result.favourites_count,
				reblogs_count: result.reblogs_count,

				// TODO: stub values
				visibility: 'public',
				spoiler_text: '',
			})
		}
	}

	return new Response(JSON.stringify(out), { headers })
}
