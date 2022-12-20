import type { Env } from 'wildebeest/types/env'
import { loadExternalMastodonAccount } from 'wildebeest/mastodon/account'
import type { Object } from 'wildebeest/activitypub/objects/'
import { getPersonById } from 'wildebeest/activitypub/actors'
import * as activityHandler from 'wildebeest/activitypub/activities/handle'
import { instanceConfig } from 'wildebeest/config/instance'
import { parseHandle } from 'wildebeest/utils/parse'
import type { Handle } from 'wildebeest/utils/parse'
import type { ContextData } from 'wildebeest/types/context'
import type { MastodonAccount, MastodonStatus } from 'wildebeest/types/'
import * as objects from 'wildebeest/activitypub/objects/'
import { actorURL } from 'wildebeest/activitypub/actors/'
import * as webfinger from 'wildebeest/webfinger/'
import * as outbox from 'wildebeest/activitypub/actors/outbox'
import * as actors from 'wildebeest/activitypub/actors'

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

	if (handle.domain === null || (handle.domain !== null && handle.domain === instanceConfig.uri)) {
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
	const out: Array<MastodonStatus> = []

	const url = new URL(request.url)
	const isPinned = url.searchParams.get('pinned') === 'true'
	if (isPinned) {
		// TODO: pinned statuses are not implemented yet. Stub the endpoint
		// to avoid returning statuses that aren't pinned.
		return new Response(JSON.stringify(out), { headers })
	}

	const acct = `${handle.localPart}@${handle.domain}`
	const link = await webfinger.queryAcctLink(handle.domain!, acct)
	if (link === null) {
		return new Response('', { status: 404 })
	}

	const actor = await actors.getAndCache(link, db)

	const activities = await outbox.get(actor)
	let results: Array<Object> = []

	for (let i = 0, len = activities.items.length; i < len; i++) {
		const activity = activities.items[i]
		const { createdObjects } = await activityHandler.handle(activity, db, userKEK, 'caching')
		results = [...results, ...createdObjects]
	}

	if (results && results.length > 0) {
		for (let i = 0, len = results.length; i < len; i++) {
			const result: any = results[i]

			const acct = `${actor.preferredUsername}@${instanceConfig.uri}`
			const account = loadExternalMastodonAccount(acct, actor)

			out.push({
				id: result.id,
				uri: objects.uri(result.id),
				created_at: result.published,
				content: result.content,
				emojis: [],
				media_attachments: [],
				tags: [],
				mentions: [],
				account,

				// TODO: stub values
				visibility: 'public',
				spoiler_text: '',
			})
		}
	}

	return new Response(JSON.stringify(out), { headers })
}

async function getLocalStatuses(request: Request, db: D1Database, handle: Handle): Promise<Response> {
	const actorId = actorURL(handle.localPart)

	const QUERY = `
SELECT objects.*
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

			const acct = `${author.preferredUsername}@${instanceConfig.uri}`
			const account = loadExternalMastodonAccount(acct, author)

			out.push({
				id: result.id,
				uri: objects.uri(result.id),
				created_at: new Date(result.cdate).toISOString(),
				content: properties.content,
				emojis: [],
				media_attachments: [],
				tags: [],
				mentions: [],
				account,

				// TODO: stub values
				visibility: 'public',
				spoiler_text: '',
			})
		}
	}

	return new Response(JSON.stringify(out), { headers })
}
