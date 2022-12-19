// https://docs.joinmastodon.org/methods/statuses/#get

import { loadExternalMastodonAccount } from 'wildebeest/mastodon/account'
import * as objects from 'wildebeest/activitypub/objects/'
import type { MastodonAccount, MastodonStatus } from 'wildebeest/types/'
import { urlToHandle } from 'wildebeest/utils/handle'
import { instanceConfig } from 'wildebeest/config/instance'
import { parseHandle } from 'wildebeest/utils/parse'
import * as actors from 'wildebeest/activitypub/actors/'
import type { Person } from 'wildebeest/activitypub/actors'
import type { ContextData } from 'wildebeest/types/context'
import { getFollowers } from 'wildebeest/activitypub/actors/follow'
import type { Env } from 'wildebeest/types/env'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ params, request, env, data }) => {
    return handleRequest(env.DATABASE, params.id as string)
}

export async function handleRequest(db: D1Database, id: string): Promise<Response> {
    const query = `
SELECT id, properties
FROM objects
WHERE objects.id=?
  `
    const { results, success, error } = await db.prepare(query).bind(id).all()
    if (!success) {
        throw new Error('SQL error: ' + error)
    }

    if (!results || results.length === 0) {
        return new Response('', { status: 404 })
    }

    const result: any = results[0]
    const properties = JSON.parse(result.properties)

    if (properties.attributedTo === undefined) {
        // FIXME: is there a better way to retrieve the author?
        // for remote, add our own metadata when downloading/caching the object?
        // for local, SQL joint?
        console.warn('missing attributedTo')
        return new Response('', { status: 500 })
    }

    const actorId = new URL(properties.attributedTo)
    const actor = await actors.get(actorId)

    const acct = `${actor.preferredUsername}@${instanceConfig.uri}`
    const account = loadExternalMastodonAccount(acct, actor)

    const out: MastodonStatus = {
        // Default values
        emojis: [],
        media_attachments: [],
        tags: [],
        mentions: [],

        // TODO: stub values
        visibility: 'public',
        spoiler_text: '',

        ...properties,

        id: result.id,
        uri: objects.uri(result.id),
        created_at: properties.published,
        account,
    }
    const headers = {
        'content-type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type, authorization',
    }
    return new Response(JSON.stringify(out), { headers })
}
