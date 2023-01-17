// https://docs.joinmastodon.org/methods/accounts/#following

import { cors } from 'wildebeest/backend/src/utils/cors'
import { loadExternalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import { MastodonAccount } from 'wildebeest/backend/src/types/account'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { getFollowingId } from 'wildebeest/backend/src/mastodon/follow'
import type { Env } from 'wildebeest/backend/src/types/env'
import { domainNotAuthorized } from 'wildebeest/backend/src/errors'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ params, request, env, data }) => {
	return handleRequest(request, env.DATABASE, params.id as string, data.connectedActor)
}

export async function handleRequest(
	request: Request,
	db: D1Database,
	id: string,
	connectedActor: Person
): Promise<Response> {
	const handle = parseHandle(id)
	const domain = new URL(request.url).hostname
	if (handle.domain !== null && handle.domain !== domain) {
		return domainNotAuthorized()
	}

	const out: Array<MastodonAccount> = []

	const following = await getFollowingId(db, connectedActor)
	for (let i = 0, len = following.length; i < len; i++) {
		const id = new URL(following[i])

		const acct = urlToHandle(id)
		const actor = await actors.get(id)
		out.push(await loadExternalMastodonAccount(acct, actor))
	}

	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(out), { headers })
}
