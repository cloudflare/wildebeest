// https://docs.joinmastodon.org/methods/accounts/#verify_credentials

import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ data }) => {
	if (!data.connectedUser) {
		return new Response('', { status: 401 })
	}

	const res = data.connectedUser

	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
