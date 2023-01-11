// https://docs.joinmastodon.org/methods/accounts/#get

import { actorURL } from 'wildebeest/backend/src/activitypub/actors'
import { getPersonById } from 'wildebeest/backend/src/activitypub/actors'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { Env } from 'wildebeest/backend/src/types/env'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import type { Handle } from 'wildebeest/backend/src/utils/parse'
import { queryAcct } from 'wildebeest/backend/src/webfinger/index'
import { loadExternalMastodonAccount, loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'

const headers = {
	'content-type': 'application/json; charset=utf-8',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type, authorization',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params }) => {
	const domain = new URL(request.url).hostname
	return handleRequest(domain, params.id as string, env.DATABASE)
}

export async function handleRequest(domain: string, id: string, db: D1Database): Promise<Response> {
	const handle = parseHandle(id)

	if (handle.domain === null || (handle.domain !== null && handle.domain === domain)) {
		// Retrieve the statuses from a local user
		return getLocalAccount(domain, db, handle)
	} else if (handle.domain !== null) {
		// Retrieve the statuses of a remote actor
		const acct = `${handle.localPart}@${handle.domain}`
		return getRemoteAccount(handle, acct)
	} else {
		return new Response('', { status: 403 })
	}
}

async function getRemoteAccount(handle: Handle, acct: string): Promise<Response> {
	// TODO: using webfinger isn't the optimal implemnetation. We could cache
	// the object in D1 and directly query the remote API, indicated by the actor's
	// url field. For now, let's keep it simple.
	const actor = await queryAcct(handle.domain!, acct)
	if (actor === null) {
		return new Response('', { status: 404 })
	}

	const res = await loadExternalMastodonAccount(acct, actor, true)
	return new Response(JSON.stringify(res), { headers })
}

async function getLocalAccount(domain: string, db: D1Database, handle: Handle): Promise<Response> {
	const actorId = actorURL(domain, handle.localPart)

	const actor = await getPersonById(db, actorId)
	if (actor === null) {
		return new Response('', { status: 404 })
	}

	const res = await loadLocalMastodonAccount(db, actor)
	return new Response(JSON.stringify(res), { headers })
}
