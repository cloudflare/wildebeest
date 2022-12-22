// https://docs.joinmastodon.org/methods/accounts/#followers

import { loadExternalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import { instanceConfig } from 'wildebeest/config/instance'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import { MastodonAccount } from 'wildebeest/backend/src/types/account'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { getFollowers } from 'wildebeest/backend/src/mastodon/follow'
import type { Env } from 'wildebeest/backend/src/types/env'
import { domainNotAuthorized } from 'wildebeest/backend/src/errors'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ params, request, env, data }) => {
	return handleRequest(env.DATABASE, params.id as string, data.connectedActor)
}

export async function handleRequest(db: D1Database, id: string, connectedActor: Person): Promise<Response> {
	const handle = parseHandle(id)
	if (handle.domain !== null && handle.domain !== instanceConfig.uri) {
		return domainNotAuthorized()
	}

	const out: Array<MastodonAccount> = []

	const followers = await getFollowers(db, connectedActor)
	for (let i = 0, len = followers.length; i < len; i++) {
		const id = new URL(followers[i])

		const acct = urlToHandle(id)
		const actor = await actors.get(id)
		out.push(await loadExternalMastodonAccount(acct, actor))
	}

	const headers = {
		'content-type': 'application/json; charset=utf-8',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
	}
	return new Response(JSON.stringify(out), { headers })
}
