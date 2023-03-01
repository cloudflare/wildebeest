import type { Env } from 'wildebeest/backend/src/types/env'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { PUBLIC_GROUP } from 'wildebeest/backend/src/activitypub/activities'
import * as errors from 'wildebeest/backend/src/errors'
import { cors } from 'wildebeest/backend/src/utils/cors'
import type { Activity } from 'wildebeest/backend/src/activitypub/activities'
import type { Note } from 'wildebeest/backend/src/activitypub/objects/note'
import { loadExternalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { makeGetActorAsId, makeGetObjectAsId } from 'wildebeest/backend/src/activitypub/activities/handle'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import type { Handle } from 'wildebeest/backend/src/utils/parse'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { MastodonStatus } from 'wildebeest/backend/src/types'
import { toMastodonStatusFromObject } from 'wildebeest/backend/src/mastodon/status'
import * as objects from 'wildebeest/backend/src/activitypub/objects'
import { actorURL } from 'wildebeest/backend/src/activitypub/actors'
import * as webfinger from 'wildebeest/backend/src/webfinger'
import * as outbox from 'wildebeest/backend/src/activitypub/actors/outbox'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import { toMastodonStatusFromRow } from 'wildebeest/backend/src/mastodon/status'
import { adjustLocalHostDomain } from 'wildebeest/backend/src/utils/adjustLocalHostDomain'

const headers = {
	...cors(),
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params }) => {
	return handleRequest(request, await getDatabase(env), params.id as string)
}

export async function handleRequest(request: Request, db: Database, id: string): Promise<Response> {
	const handle = parseHandle(id)
	const url = new URL(request.url)
	const domain = url.hostname
	const offset = Number.parseInt(url.searchParams.get('offset') ?? '0')
	const withReplies = url.searchParams.get('with-replies') === 'true'

	if (handle.domain === null || (handle.domain !== null && handle.domain === domain)) {
		// Retrieve the statuses from a local user
		return getLocalStatuses(request, db, handle, offset, withReplies)
	} else if (handle.domain !== null) {
		// Retrieve the statuses of a remote actor
		return getRemoteStatuses(request, handle, db)
	} else {
		return new Response('', { status: 403 })
	}
}

async function getRemoteStatuses(request: Request, handle: Handle, db: Database): Promise<Response> {
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

	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: use account
	const account = await loadExternalMastodonAccount(acct, actor)

	const promises = activities.items.map(async (activity: Activity) => {
		const getObjectAsId = makeGetObjectAsId(activity)
		const getActorAsId = makeGetActorAsId(activity)

		if (activity.type === 'Create') {
			const actorId = getActorAsId()
			const originalObjectId = getObjectAsId()
			const res = await objects.cacheObject(domain, db, activity.object, actorId, originalObjectId, false)
			return toMastodonStatusFromObject(db, res.object as Note, domain)
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
						return null
					}
					obj = res.object
				} catch (err: any) {
					console.warn(`failed to retrieve object ${objectId}: ${err.message}`)
					return null
				}
			} else {
				// Object already exists locally, we can just use it.
				obj = localObject
			}

			return toMastodonStatusFromObject(db, obj, domain)
		}

		// FIXME: support other Activities, like Update.
	})
	const statuses = (await Promise.all(promises)).filter(Boolean)

	return new Response(JSON.stringify(statuses), { headers })
}

export async function getLocalStatuses(
	request: Request,
	db: Database,
	handle: Handle,
	offset: number,
	withReplies: boolean
): Promise<Response> {
	const domain = new URL(request.url).hostname
	const actorId = actorURL(adjustLocalHostDomain(domain), handle.localPart)

	const QUERY = `
SELECT objects.*,
       actors.id as actor_id,
       actors.cdate as actor_cdate,
       actors.properties as actor_properties,
       outbox_objects.actor_id as publisher_actor_id,
       (SELECT count(*) FROM actor_favourites WHERE actor_favourites.object_id=objects.id) as favourites_count,
       (SELECT count(*) FROM actor_reblogs WHERE actor_reblogs.object_id=objects.id) as reblogs_count,
       (SELECT count(*) FROM actor_replies WHERE actor_replies.in_reply_to_object_id=objects.id) as replies_count
FROM outbox_objects
INNER JOIN objects ON objects.id=outbox_objects.object_id
INNER JOIN actors ON actors.id=outbox_objects.actor_id
WHERE objects.type='Note'
      ${withReplies ? '' : 'AND ' + db.qb.jsonExtractIsNull('objects.properties', 'inReplyTo')}
      AND outbox_objects.target = '${PUBLIC_GROUP}'
      AND outbox_objects.actor_id = ?1
      AND outbox_objects.cdate > ?2${db.qb.psqlOnly('::timestamp')}
ORDER by outbox_objects.published_date DESC
LIMIT ?3 OFFSET ?4
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

	let afterCdate = db.qb.epoch()
	if (url.searchParams.has('max_id')) {
		// Client asked to retrieve statuses after the max_id
		// As opposed to Mastodon we don't use incremental ID but UUID, we need
		// to retrieve the cdate of the max_id row and only show the newer statuses.
		const maxId = url.searchParams.get('max_id')!

		const row: any = await db.prepare('SELECT cdate FROM outbox_objects WHERE object_id=?').bind(maxId).first()
		if (!row) {
			return errors.statusNotFound(maxId)
		}
		afterCdate = row.cdate
	}

	const { success, error, results } = await db
		.prepare(QUERY)
		.bind(actorId.toString(), afterCdate, DEFAULT_LIMIT, offset)
		.all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	if (!results) {
		return new Response(JSON.stringify(out), { headers })
	}

	for (let i = 0, len = results.length; i < len; i++) {
		const status = await toMastodonStatusFromRow(domain, db, results[i])
		if (status !== null) {
			out.push(status)
		}
	}

	return new Response(JSON.stringify(out), { headers })
}
