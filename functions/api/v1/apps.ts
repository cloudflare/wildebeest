import { ContextData } from 'wildebeest/backend/src/types/context'
import { cors } from 'wildebeest/backend/src/utils/cors'
import * as errors from 'wildebeest/backend/src/errors'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import type { Env } from 'wildebeest/backend/src/types/env'
import { createClient } from 'wildebeest/backend/src/mastodon/client'
import { VAPIDPublicKey } from 'wildebeest/backend/src/mastodon/subscription'
import { getVAPIDKeys } from 'wildebeest/backend/src/config'
import { readBody } from 'wildebeest/backend/src/utils/body'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

type AppsPost = {
	redirect_uris: string
	website?: string
	client_name: string
	scopes: string
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env }) => {
	return handleRequest(await getDatabase(env), request, getVAPIDKeys(env))
}

export async function handleRequest(db: Database, request: Request, vapidKeys: JWK) {
	if (request.method !== 'POST') {
		return errors.methodNotAllowed()
	}

	const body: AppsPost = await readBody<AppsPost>(request)

	// Parameter validation according to https://github.com/mastodon/mastodon/blob/main/app/lib/application_extension.rb
	if (body.client_name === undefined || body.client_name?.trim() === '') {
		return errors.unprocessableEntity('client_name cannot be an empty string')
	} else if (body.client_name?.length > 60) {
		return errors.unprocessableEntity('client_name cannot exceed 60 characters')
	} else if (body.redirect_uris === undefined || body.redirect_uris?.trim() === '') {
		return errors.unprocessableEntity('redirect_uris cannot be an empty string')
	} else if (body.redirect_uris?.length > 2000) {
		return errors.unprocessableEntity('redirect_uris cannot exceed 2000 characters')
	} else if (body.redirect_uris !== 'urn:ietf:wg:oauth:2.0:oob') {
		try {
			new URL('', body.redirect_uris)
		} catch {
			return errors.unprocessableEntity('redirect_uris must be a valid URI')
		}
	} else if (body.website) {
		if (body.website.length > 2000) {
			return errors.unprocessableEntity('website cannot exceed 2000 characters')
		}
		try {
			new URL('', body.website)
		} catch {
			return errors.unprocessableEntity('website is invalid URI')
		}
	}

	const client = await createClient(db, body.client_name, body.redirect_uris, body.scopes, body.website)
	const vapidKey = VAPIDPublicKey(vapidKeys)

	const res = {
		name: body.client_name,
		website: body.website,
		redirect_uri: body.redirect_uris,

		client_id: client.id,
		client_secret: client.secret,

		vapid_key: vapidKey,

		// FIXME: stub value
		id: '20',
	}
	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
