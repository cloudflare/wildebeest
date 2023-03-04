// https://docs.joinmastodon.org/methods/accounts/#verify_credentials

import { cors } from 'wildebeest/backend/src/utils/cors'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import { parseHandle, type Handle } from 'wildebeest/backend/src/utils/parse'
import { loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import type { Env } from 'wildebeest/backend/src/types/env'
import * as errors from 'wildebeest/backend/src/errors'
import type { MastodonAccount, CredentialAccount } from 'wildebeest/backend/src/types/account'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { getDatabase } from 'wildebeest/backend/src/database'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ data, env }) => {
	if (!data.connectedActor) {
		return errors.notAuthorized('no connected user')
	}
	const connectedActor: Actor = data.connectedActor
	const handle: Handle = parseHandle(urlToHandle(connectedActor.id))
	const mastodonAccount: MastodonAccount | null = await loadLocalMastodonAccount(
		handle,
		env.DOMAIN,
		await getDatabase(env)
	)
	if (mastodonAccount === null) {
		return errors.mastodonAccountNotFound(handle.localPart)
	}

	const res: CredentialAccount = {
		...mastodonAccount,
		source: {
			note: mastodonAccount.note!,
			fields: mastodonAccount.fields!,
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
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
