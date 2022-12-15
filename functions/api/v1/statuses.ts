// https://docs.joinmastodon.org/methods/statuses/#create

import { createNote } from 'wildebeest/activitypub/objects/note'
import { getMentions } from 'wildebeest/mastodon/status'
import * as activities from 'wildebeest/activitypub/activities/create'
import type { Env } from 'wildebeest/types/env'
import type { ContextData } from 'wildebeest/types/context'
import type { MastodonAccount } from 'wildebeest/types/account'
import { queryAcct } from 'wildebeest/webfinger/'
import { deliver } from 'wildebeest/activitypub/deliver'
import { addObjectInOutbox } from 'wildebeest/activitypub/actors/outbox'
import type { Person } from 'wildebeest/activitypub/actors'
import { getSigningKey } from 'wildebeest/mastodon/account'

type StatusCreate = {
    status: string
    visibility: string
    sensitive: boolean
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
    return handleRequest(request, env.DATABASE, data.connectedActor, data.connectedUser, env.userKEK)
}

export async function handleRequest(
    request: Request,
    db: D1Database,
    connectedActor: Person,
    connectedUser: MastodonAccount,
    userKEK: string
): Promise<Response> {
    // TODO: implement Idempotency-Key

    if (request.method !== 'POST') {
        return new Response('', { status: 400 })
    }

    const body = await request.json<StatusCreate>()
    console.log(body)
    if (body.status === undefined || body.visibility === undefined) {
        return new Response('', { status: 400 })
    }

    const note = await createNote(db, body.status)

    // If the status is mentioned other persons, we need to delivery it to them.
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
        const activity = activities.create(connectedActor, note)
        const signingKey = await getSigningKey(userKEK, db, connectedActor)
        await deliver(signingKey, targetActor, activity)
    }

    await addObjectInOutbox(db, connectedActor, note)

    const res: any = {
        id: note.id,
        uri: note.url,
        created_at: note.published,
        account: connectedUser,
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
