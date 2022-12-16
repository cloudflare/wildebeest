// https://docs.joinmastodon.org/methods/notifications/#get

import type { Env } from 'wildebeest/types/env'
import * as objects from 'wildebeest/activitypub/objects/'
import type { Person } from 'wildebeest/activitypub/actors'
import type { ContextData } from 'wildebeest/types/context'
import type { Notification } from 'wildebeest/types/notification'
import type { MastodonStatus } from 'wildebeest/types/'
import { getPersonById } from 'wildebeest/activitypub/actors/'
import { loadExternalMastodonAccount } from 'wildebeest/mastodon/account'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
    return handleRequest(env.DATABASE, data.connectedActor)
}

const headers = {
    'content-type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
}

export async function handleRequest(db: D1Database, connectedActor: Person): Promise<Response> {
    const query = `
    SELECT
        objects.*,
        actor_notifications.type,
        actor_notifications.actor_id,
        actor_notifications.from_actor_id,
        actor_notifications.id as notif_id
    FROM actor_notifications
    INNER JOIN objects ON objects.id=actor_notifications.object_id
    WHERE actor_id=?
    ORDER BY actor_notifications.cdate DESC
  `

    const stmt = db.prepare(query).bind(connectedActor.id)
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

        const fromActor = await getPersonById(db, result.from_actor_id)
        if (!fromActor) {
            console.warn('unknown actor')
            continue
        }

        const acct2 = `todo@example.com` // FIXME: how to deal with remote acct?
        const fromAccount = loadExternalMastodonAccount(acct2, fromActor)

        const status: MastodonStatus = {
            id: result.id,
            content: properties.content,
            uri: objects.uri(result.id),
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

        out.push({
            id: result.notif_id,
            type: result.type,
            created_at: result.created_at,
            account: fromAccount,
            status,
        })
    }
    return new Response(JSON.stringify(out), { headers })
}
