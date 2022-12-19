// https://docs.joinmastodon.org/methods/accounts/#get

import { instanceConfig } from 'wildebeest/config/instance'
import { actorURL } from 'wildebeest/activitypub/actors/'
import { getPersonById } from 'wildebeest/activitypub/actors'
import type { ContextData } from 'wildebeest/types/context'
import type { Env } from 'wildebeest/types/env'
import type { MastodonAccount } from 'wildebeest/types/account'
import { parseHandle } from 'wildebeest/utils/parse'
import type { Handle } from 'wildebeest/utils/parse'
import { queryAcct } from 'wildebeest/webfinger/index'
import { loadExternalMastodonAccount, loadLocalMastodonAccount } from 'wildebeest/mastodon/account'

const headers = {
	'content-type': 'application/json; charset=utf-8',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type, authorization',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ env, params }) => {
	return handleRequest(params.id as string, env.DATABASE)
}

export async function handleRequest(id: string, db: D1Database): Promise<Response> {
	const handle = parseHandle(id)

	const acct = `${handle.localPart}@${handle.domain}`

	if (handle.domain === null || (handle.domain !== null && handle.domain === instanceConfig.uri)) {
		// Retrieve the statuses from a local user
		return getLocalAccount(db, handle, acct)
	} else if (handle.domain !== null) {
		// Retrieve the statuses of a remote actor
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

	const res = loadExternalMastodonAccount(acct, actor)
	return new Response(JSON.stringify(res), { headers })
}

async function getLocalAccount(db: D1Database, handle: Handle, acct: string): Promise<Response> {
	const actorId = actorURL(handle.localPart)

	const actor = await getPersonById(db, actorId)
	if (actor === null) {
		return new Response('', { status: 404 })
	}

	const res = await loadLocalMastodonAccount(db, acct, actor)
	return new Response(JSON.stringify(res), { headers })
}
