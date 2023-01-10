// https://docs.joinmastodon.org/methods/oauth/#token

import * as errors from 'wildebeest/backend/src/errors'
import type { Env } from 'wildebeest/backend/src/types/env'
import { readBody } from 'wildebeest/backend/src/utils/body'
import { getClientById } from 'wildebeest/backend/src/mastodon/client'

type Body = {
	code: string | null
}

export const onRequest: PagesFunction<Env, any> = async ({ request, env }) => {
	return handleRequest(env.DATABASE, request)
}

export async function handleRequest(db: D1Database, request: Request): Promise<Response> {
	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
		'content-type': 'application/json; charset=utf-8',
	}

	if (request.method === 'OPTIONS') {
		return new Response('', { headers })
	}

	const data = await readBody<Body>(request)
	if (!data.code) {
		return errors.notAuthorized('missing authorization')
	}

	const parts = data.code.split('.')
	const clientId = parts[0]

	const client = await getClientById(db, clientId)
	if (client === null) {
		return errors.clientUnknown()
	}

	const res = {
		access_token: data.code,
		token_type: 'Bearer',
		scope: client.scopes,
		created_at: (Date.now() / 1000) | 0,
	}
	return new Response(JSON.stringify(res), { headers })
}
