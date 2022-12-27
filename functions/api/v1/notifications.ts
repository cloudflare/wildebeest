// https://docs.joinmastodon.org/methods/notifications/#get

import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as objects from 'wildebeest/backend/src/activitypub/objects'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Notification } from 'wildebeest/backend/src/types/notification'
import type { MastodonStatus } from 'wildebeest/backend/src/types'
import { getPersonById } from 'wildebeest/backend/src/activitypub/actors'
import { loadExternalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(domain, env.DATABASE, data.connectedActor)
}

const headers = {
	'content-type': 'application/json; charset=utf-8',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type, authorization',
}

export async function handleRequest(domain: string, db: D1Database, connectedActor: Person): Promise<Response> {
	const query = `
    SELECT
        objects.*,
        actor_notifications.type,
        actor_notifications.actor_id,
        actor_notifications.from_actor_id,
        actor_notifications.id as notif_id
    FROM actor_notifications
    LEFT JOIN objects ON objects.id=actor_notifications.object_id
    WHERE actor_id=?
    ORDER BY actor_notifications.cdate DESC
  `

	const stmt = db.prepare(query).bind(connectedActor.id.toString())
	const { results, success, error } = await stmt.all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	const out: Array<Notification> = []
	if (!results || results.length === 0) {
		return new Response(JSON.stringify(out), { headers })
	}

	for (let i = 0, len = results.length; i < len; i++) {
		const result = results[i] as any
		const properties = JSON.parse(result.properties)
		const from_actor_id = new URL(result.from_actor_id)

		const fromActor = await getPersonById(db, from_actor_id)
		if (!fromActor) {
			console.warn('unknown actor')
			continue
		}

		const acct = urlToHandle(from_actor_id)
		const fromAccount = await loadExternalMastodonAccount(acct, fromActor)

		const notif: Notification = {
			id: result.notif_id,
			type: result.type,
			created_at: result.created_at,
			account: fromAccount,
		}

		if (result.type === 'mention' || result.type === 'favourite') {
			notif.status = {
				id: result.mastodon_id,
				content: properties.content,
				uri: objects.uri(domain, result.id),
				created_at: new Date(result.cdate).toISOString(),

				emojis: [],
				media_attachments: [],
				tags: [],
				mentions: [],

				// TODO: a shortcut has been taked. We assume that the actor
				// generating the notification also created the object. In practice
				// likely true but not guarantee.
				account: fromAccount,

				// TODO: stub values
				visibility: 'public',
				spoiler_text: '',
			}
		}

		out.push(notif)
	}
	return new Response(JSON.stringify(out), { headers })
}
