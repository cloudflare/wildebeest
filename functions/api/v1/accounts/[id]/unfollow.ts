import { parseHandle } from 'wildebeest/utils/parse'
import { deliver } from 'wildebeest/activitypub/deliver'
import { getSigningKey } from 'wildebeest/mastodon/account'
import type { Person } from 'wildebeest/activitypub/actors'
import * as webfinger from 'wildebeest/webfinger/'
import type { ContextData } from 'wildebeest/types/context'
import type { Env } from 'wildebeest/types/env'
import * as unfollow from 'wildebeest/activitypub/activities/unfollow'
import type { Relationship } from 'wildebeest/types/account'
import { removeFollowing } from 'wildebeest/activitypub/actors/follow'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params, data }) => {
    return handleRequest(request, env.DATABASE, params.id as string, data.connectedActor, env.userKEK)
}

export async function handleRequest(
    request: Request,
    db: D1Database,
    id: string,
    connectedActor: Person,
    userKEK: string
): Promise<Response> {
    if (request.method !== 'POST') {
        return new Response('', { status: 400 })
    }

    const handle = parseHandle(id)

    // Only allow to unfollow remote users
    // TODO: implement unfollowing local users
    if (handle.domain === null) {
        return new Response('', { status: 403 })
    }

    const acct = `${handle.localPart}@${handle.domain}`
    const targetActor = await webfinger.queryAcct(handle.domain!, acct)
    if (targetActor === null) {
        return new Response('', { status: 404 })
    }

    const activity = unfollow.create(connectedActor, targetActor)
    const signingKey = await getSigningKey(userKEK, db, connectedActor)
    await deliver(signingKey, connectedActor, targetActor, activity)
    await removeFollowing(db, connectedActor, targetActor)

    const res: Relationship = {
        id: '0',
    }
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type',
        'content-type': 'application/json; charset=utf-8',
    }
    return new Response(JSON.stringify(res), { headers })
}
