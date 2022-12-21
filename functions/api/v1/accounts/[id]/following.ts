// https://docs.joinmastodon.org/methods/accounts/#following

import { loadExternalMastodonAccount } from 'wildebeest/mastodon/account'
import { instanceConfig } from 'wildebeest/config/instance'
import { parseHandle } from 'wildebeest/utils/parse'
import { urlToHandle } from 'wildebeest/utils/handle'
import * as actors from 'wildebeest/activitypub/actors/'
import { MastodonAccount } from 'wildebeest/types/account'
import type { Person } from 'wildebeest/activitypub/actors'
import type { ContextData } from 'wildebeest/types/context'
import { getFollowingId } from 'wildebeest/activitypub/actors/follow'
import type { Env } from 'wildebeest/types/env'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ params, request, env, data }) => {
	return handleRequest(env.DATABASE, params.id as string, data.connectedActor)
}

export async function handleRequest(db: D1Database, id: string, connectedActor: Person): Promise<Response> {
	const handle = parseHandle(id)
	if (handle.domain !== null && handle.domain !== instanceConfig.uri) {
		return new Response('', { status: 403 })
	}

	const out: Array<MastodonAccount> = []

	const following = await getFollowingId(db, connectedActor)
	for (let i = 0, len = following.length; i < len; i++) {
		const id = new URL(following[i])

		const acct = urlToHandle(id)
		const actor = await actors.get(id)
		out.push(loadExternalMastodonAccount(acct, actor))
	}

	const headers = {
		'content-type': 'application/json; charset=utf-8',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
	}
	return new Response(JSON.stringify(out), { headers })
}
