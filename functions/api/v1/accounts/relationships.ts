// https://docs.joinmastodon.org/methods/accounts/#relationships

import type { PluginData } from '@cloudflare/pages-plugin-cloudflare-access'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { MastodonAccount } from 'wildebeest/backend/src/types/account'
import { getFollowingAcct } from 'wildebeest/backend/src/activitypub/actors/follow'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params, data }) => {
	return handleRequest(request, env.DATABASE, data.connectedActor)
}

export async function handleRequest(req: Request, db: D1Database, connectedActor: Person): Promise<Response> {
	const url = new URL(req.url)

	let ids = []
	if (url.searchParams.has('id')) {
		ids.push(url.searchParams.get('id'))
	}

	if (url.searchParams.has('id[]')) {
		ids = url.searchParams.getAll('id[]')
	}

	if (ids.length === 0) {
		return new Response('', { status: 400 })
	}

	const res = []
	const following = await getFollowingAcct(db, connectedActor)

	for (let i = 0, len = ids.length; i < len; i++) {
		const id = ids[i]
		if (!id) {
			break
		}

		res.push({
			id,
			following: following.includes(id),
			showing_reblogs: false,
			notifying: false,
			followed_by: false,
			blocking: false,
			blocked_by: false,
			muting: false,
			muting_notifications: false,
			requested: false,
			domain_blocking: false,
			endorsed: false,
		})
	}

	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
