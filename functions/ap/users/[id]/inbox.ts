import { parseHandle } from 'wildebeest/utils/parse'
import type { Env } from 'wildebeest/types/env'
import * as actors from 'wildebeest/activitypub/actors'
import { instanceConfig } from 'wildebeest/config/instance'
import type { Activity } from 'wildebeest/activitypub/activities/'
import * as activities from 'wildebeest/activitypub/activities/'

export const onRequest: PagesFunction<Env, any> = async ({ params, request, env }) => {
    const activity = await request.json<Activity>()

    return handleRequest(env.DATABASE, params.id as string, activity)
}

export async function handleRequest(db: D1Database, id: string, activity: Activity): Promise<Response> {
    const handle = parseHandle(id)

    if (handle.domain !== null && handle.domain !== instanceConfig.uri) {
        return new Response('', { status: 403 })
    }

    const person = await actors.getPersonById(db, handle.localPart)
    if (person === null) {
        return new Response('', { status: 404 })
    }

    await activities.handle(activity, db)

    return new Response('', { status: 200 })
}
