// https://docs.joinmastodon.org/methods/oauth/#token

import { cors } from 'wildebeest/backend/src/utils/cors'
import * as errors from 'wildebeest/backend/src/errors'
import type { Env } from 'wildebeest/backend/src/types/env'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { readBody } from 'wildebeest/backend/src/utils/body'
import { getClientById } from 'wildebeest/backend/src/mastodon/client'

type Body = {
	code: string | null
}

export const onRequest: PagesFunction<Env, any> = async ({ request, env }) => {
	return handleRequest(await getDatabase(env), request)
}

export async function handleRequest(db: Database, request: Request): Promise<Response> {
	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}

	if (request.method === 'OPTIONS') {
		return new Response('', { headers })
	}

	let data: Body = { code: null }
	try {
		data = await readBody<Body>(request)
	} catch (err) {
		// ignore error
	}

	let code = data.code
	if (!code) {
		const url = new URL(request.url)
		code = url.searchParams.get('code')
	}
	if (!code) {
		return errors.notAuthorized('missing authorization')
	}

	const parts = code.split('.')
	const clientId = parts[0]

	const client = await getClientById(db, clientId)
	if (client === null) {
		return errors.clientUnknown()
	}

	const res = {
		access_token: code,
		token_type: 'Bearer',
		scope: client.scopes,
		created_at: (Date.now() / 1000) | 0,
	}
	return new Response(JSON.stringify(res), { headers })
}
