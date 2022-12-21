import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import { deliverToActor } from 'wildebeest/backend/src/activitypub/deliver'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import * as webfinger from 'wildebeest/backend/src/webfinger'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as follow from 'wildebeest/backend/src/activitypub/activities/follow'
import type { Relationship } from 'wildebeest/backend/src/types/account'
import { addFollowing } from 'wildebeest/backend/src/activitypub/actors/follow'

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

	// Only allow to follow remote users
	// TODO: implement following local users
	if (handle.domain === null) {
		return new Response('', { status: 403 })
	}

	const acct = `${handle.localPart}@${handle.domain}`
	const link = await webfinger.queryAcctLink(handle.domain!, acct)
	if (link === null) {
		return new Response('', { status: 404 })
	}

	const targetActor = await actors.getAndCache(link, db)

	const activity = follow.create(connectedActor, targetActor)
	const signingKey = await getSigningKey(userKEK, db, connectedActor)
	await deliverToActor(signingKey, connectedActor, targetActor, activity)

	const res: Relationship = {
		id: await addFollowing(db, connectedActor, targetActor, acct),
	}
	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type',
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
