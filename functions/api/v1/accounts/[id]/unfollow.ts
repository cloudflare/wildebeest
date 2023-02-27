import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { cors } from 'wildebeest/backend/src/utils/cors'
import { deliverToActor } from 'wildebeest/backend/src/activitypub/deliver'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import * as webfinger from 'wildebeest/backend/src/webfinger'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as unfollow from 'wildebeest/backend/src/activitypub/activities/unfollow'
import type { Relationship } from 'wildebeest/backend/src/types/account'
import { removeFollowing } from 'wildebeest/backend/src/mastodon/follow'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params, data }) => {
	return handleRequest(request, await getDatabase(env), params.id as string, data.connectedActor, env.userKEK)
}

export async function handleRequest(
	request: Request,
	db: Database,
	id: string,
	connectedActor: Person,
	userKEK: string
): Promise<Response> {
	if (request.method !== 'POST') {
		return new Response('', { status: 400 })
	}
	const domain = new URL(request.url).hostname
	const handle = parseHandle(id)

	// Only allow to unfollow remote users
	// TODO: implement unfollowing local users
	if (handle.domain === null) {
		return new Response('', { status: 403 })
	}

	const acct = `${handle.localPart}@${handle.domain}`
	const targetActor = await webfinger.queryAcct(handle.domain!, db, acct)
	if (targetActor === null) {
		return new Response('', { status: 404 })
	}

	const activity = unfollow.create(connectedActor, targetActor)
	const signingKey = await getSigningKey(userKEK, db, connectedActor)
	await deliverToActor(signingKey, connectedActor, targetActor, activity, domain)
	await removeFollowing(db, connectedActor, targetActor)

	const res: Relationship = {
		// FIXME: stub
		id: '0',
	}
	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
