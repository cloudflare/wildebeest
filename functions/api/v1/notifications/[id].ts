// https://docs.joinmastodon.org/methods/notifications/#get-one

import type { Notification } from 'wildebeest/backend/src/types/notification'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import { getPersonById } from 'wildebeest/backend/src/activitypub/actors'
import { loadExternalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import * as objects from 'wildebeest/backend/src/activitypub/objects'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'

const headers = {
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ data, request, env, params }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(domain, params.id as string, env.DATABASE, data.connectedActor)
}

export async function handleRequest(
	domain: string,
	id: string,
	db: D1Database,
	connectedActor: Person
): Promise<Response> {
	const query = `
        SELECT
            objects.*,
            actor_notifications.type,
            actor_notifications.actor_id,
            actor_notifications.from_actor_id,
            actor_notifications.id as notif_id
        FROM actor_notifications
        INNER JOIN objects ON objects.id=actor_notifications.object_id
        WHERE actor_notifications.id=? AND actor_notifications.actor_id=?
    `

	const row: any = await db.prepare(query).bind(id, connectedActor.id.toString()).first()

	const from_actor_id = new URL(row.from_actor_id)
	const fromActor = await getPersonById(db, from_actor_id)
	if (!fromActor) {
		throw new Error('unknown from actor')
	}

	const acct = urlToHandle(from_actor_id)
	const fromAccount = await loadExternalMastodonAccount(acct, fromActor)

	const out: Notification = {
		id: row.notif_id.toString(),
		type: row.type,
		created_at: new Date(row.cdate).toISOString(),
		account: fromAccount,
	}

	if (row.type === 'mention' || row.type === 'favourite') {
		const properties = JSON.parse(row.properties)

		out.status = {
			id: row.mastodon_id,
			content: properties.content,
			uri: row.id,
			created_at: new Date(row.cdate).toISOString(),

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

	return new Response(JSON.stringify(out), { headers })
}
