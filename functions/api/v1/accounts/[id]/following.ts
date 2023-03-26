// https://docs.joinmastodon.org/methods/accounts/#following

import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import type { Handle } from 'wildebeest/backend/src/utils/parse'
import { actorURL } from 'wildebeest/backend/src/activitypub/actors'
import { cors } from 'wildebeest/backend/src/utils/cors'
import { loadExternalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import { MastodonAccount } from 'wildebeest/backend/src/types/account'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import * as localFollow from 'wildebeest/backend/src/mastodon/follow'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import * as webfinger from 'wildebeest/backend/src/webfinger'
import { getFollowing, loadActors } from 'wildebeest/backend/src/activitypub/actors/follow'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ params, request, env }) => {
	return handleRequest(request, await getDatabase(env), params.id as string)
}

export async function handleRequest(request: Request, db: Database, id: string): Promise<Response> {
	const handle = parseHandle(id)
	const domain = new URL(request.url).hostname

	if (handle.domain === null || (handle.domain !== null && handle.domain === domain)) {
		// Retrieve the infos from a local user
		return getLocalFollowing(request, handle, db)
	} else if (handle.domain !== null) {
		// Retrieve the infos of a remote actor
		return getRemoteFollowing(request, handle, db)
	} else {
		return new Response('', { status: 403 })
	}
}

async function getRemoteFollowing(request: Request, handle: Handle, db: Database): Promise<Response> {
	const acct = `${handle.localPart}@${handle.domain}`
	const link = await webfinger.queryAcctLink(handle.domain!, acct)
	if (link === null) {
		return new Response('', { status: 404 })
	}

	const actor = await actors.getAndCache(link, db)
	const followingIds = await getFollowing(actor)
	const following = await loadActors(db, followingIds)

	const promises = following.map((actor) => {
		const acct = urlToHandle(actor.id)
		return loadExternalMastodonAccount(acct, actor, false)
	})

	const out = await Promise.all(promises)
	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(out), { headers })
}

async function getLocalFollowing(request: Request, handle: Handle, db: Database): Promise<Response> {
	const domain = new URL(request.url).hostname
	const actorId = actorURL(domain, handle.localPart)
	const actor = await actors.getAndCache(actorId, db)

	const following = await localFollow.getFollowingId(db, actor)
	const out: Array<MastodonAccount> = []

	for (let i = 0, len = following.length; i < len; i++) {
		const id = new URL(following[i])
		const acct = urlToHandle(id)

		try {
			const actor = await actors.getAndCache(id, db)
			out.push(await loadExternalMastodonAccount(acct, actor))
		} catch (err: any) {
			console.warn(`failed to retrieve following (${id}): ${err.message}`)
		}
	}

	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(out), { headers })
}
