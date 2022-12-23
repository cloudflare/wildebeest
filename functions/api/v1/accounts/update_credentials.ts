// https://docs.joinmastodon.org/methods/accounts/#update_credentials

import * as errors from 'wildebeest/backend/src/errors'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import * as activities from 'wildebeest/backend/src/activitypub/activities/update'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import { deliverFollowers } from 'wildebeest/backend/src/activitypub/deliver'
import * as images from 'wildebeest/backend/src/images'
import type { Env } from 'wildebeest/backend/src/types/env'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { updateActorProperty } from 'wildebeest/backend/src/activitypub/actors'
import type { CredentialAccount, MastodonAccount } from 'wildebeest/backend/src/types/account'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { loadLocalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type, authorization',
	'content-type': 'application/json; charset=utf-8',
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, data, env }) => {
	return handleRequest(
		env.DATABASE,
		request,
		data.connectedUser,
		data.connectedActor,
		env.CF_ACCOUNT_ID,
		env.CF_API_TOKEN,
		env.userKEK
	)
}

export async function handleRequest(
	db: D1Database,
	request: Request,
	connectedUser: MastodonAccount,
	connectedActor: Actor,

	accountId: string,
	apiToken: string,

	userKEK: string
): Promise<Response> {
	if (!connectedUser) {
		return new Response('', { status: 401 })
	}

	if (request.method !== 'PATCH') {
		return new Response('', { headers, status: 400 })
	}

	// update actor
	{
		const formData = await request.formData()

		if (formData.has('display_name')) {
			const value = formData.get('display_name')!
			await updateActorProperty(db, connectedActor.id, 'name', value)
		}

		if (formData.has('note')) {
			const value = formData.get('note')!
			await updateActorProperty(db, connectedActor.id, 'summary', value)
		}

		if (formData.has('avatar')) {
			const value = formData.get('avatar')! as any

			const config = { accountId, apiToken }
			const url = await images.uploadImage(value, config)
			await updateActorProperty(db, connectedActor.id, 'icon.url', url.toString())
		}

		if (formData.has('header')) {
			const value = formData.get('header')! as any

			const config = { accountId, apiToken }
			const url = await images.uploadImage(value, config)
			await updateActorProperty(db, connectedActor.id, 'image.url', url.toString())
		}
	}

	// reload the connectedUser and sent back updated infos
	{
		const actor = await actors.getPersonById(db, connectedActor.id)
		if (actor === null) {
			return errors.notAuthorized('user not found')
		}
		const connectedUser = await loadLocalMastodonAccount(db, actor)

		const res: CredentialAccount = {
			...connectedUser,
			source: {
				note: connectedUser.note,
				fields: connectedUser.fields,
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

		// send updates
		const activity = activities.create(connectedActor, actor)
		const signingKey = await getSigningKey(userKEK, db, connectedActor)
		await deliverFollowers(db, signingKey, connectedActor, activity)

		return new Response(JSON.stringify(res), { headers })
	}
}
