import { parseHandle } from 'wildebeest/utils/parse'
import type { Env } from 'wildebeest/types/env'
import * as actors from 'wildebeest/activitypub/actors'
import { instanceConfig } from 'wildebeest/config/instance'
import type { Activity } from 'wildebeest/activitypub/activities/'
import * as activities from 'wildebeest/activitypub/activities/'
import { actorURL } from 'wildebeest/activitypub/actors/'

export const onRequest: PagesFunction<Env, any> = async ({ params, request, env }) => {
    const activity = await request.json<Activity>()
    return handleRequest(env.DATABASE, params.id as string, activity, env.userKEK)
}

export async function handleRequest(
    db: D1Database,
    id: string,
    activity: Activity,
    userKEK: string
): Promise<Response> {
    const handle = parseHandle(id)

    if (handle.domain !== null && handle.domain !== instanceConfig.uri) {
        return new Response('', { status: 403 })
    }

    const actorId = actorURL(handle.localPart)
    const person = await actors.getPersonById(db, actorId)
    if (person === null) {
        return new Response('', { status: 404 })
    }

    await activities.handle(activity, db, userKEK)

    return new Response('', { status: 200 })
}
