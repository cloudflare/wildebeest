// https://docs.joinmastodon.org/methods/accounts/#verify_credentials

import { loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import type { Env } from 'wildebeest/backend/src/types/env'
import type { CredentialAccount } from 'wildebeest/backend/src/types/account'
import type { ContextData } from 'wildebeest/backend/src/types/context'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ data, env }) => {
	if (!data.connectedActor) {
		return new Response('', { status: 401 })
	}
	const user = await loadLocalMastodonAccount(env.DATABASE, data.connectedActor)

	const res: CredentialAccount = {
		...user,
		source: {
			note: user.note,
			fields: user.fields,
			privacy: 'public',
			sensitive: false,
			language: 'en',
			follow_requests_count: 0,
		},
		role: {
			id: '0',
			name: 'user',
			color: '',
			position: 1,
			permissions: 0,
			highlighted: true,
			created_at: '2022-09-08T22:48:07.983Z',
			updated_at: '2022-09-08T22:48:07.983Z',
		},
	}

	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
