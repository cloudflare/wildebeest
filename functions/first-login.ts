// Screen after the first login to let the user configure the account (username
// especially)
import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import { createPerson } from 'wildebeest/backend/src/activitypub/actors'
import { parse } from 'cookie'
import * as errors from 'wildebeest/backend/src/errors'
import * as access from 'wildebeest/backend/src/access'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { getJwtEmail } from 'wildebeest/backend/src/utils/auth/getJwtEmail'

export const onRequestPost: PagesFunction<Env, any, ContextData> = async ({ request, env }) => {
	return handlePostRequest(request, await getDatabase(env), env.userKEK, env.ACCESS_AUTH_DOMAIN, env.ACCESS_AUD)
}

export async function handlePostRequest(
	request: Request,
	db: Database,
	userKEK: string,
	accessDomain: string,
	accessAud: string
): Promise<Response> {
	const url = new URL(request.url)
	const cookie = parse(request.headers.get('Cookie') || '')
	let email = ''
	const jwt = cookie['CF_Authorization']
	try {
		email = getJwtEmail(jwt ?? '')
	} catch (e) {
		return errors.notAuthorized((e as Error)?.message)
	}

	await access.generateValidator({
		jwt,
		domain: accessDomain,
		aud: accessAud,
	})(request)

	const domain = url.hostname

	const formData = await request.formData()
	const properties: Record<string, string> = {}

	if (formData.has('username')) {
		properties.preferredUsername = (formData.get('username') as string) || ''
	}

	if (formData.has('name')) {
		properties.name = (formData.get('name') as string) || ''
	}

	await createPerson(domain, db, userKEK, email, properties)

	if (!url.searchParams.has('redirect_uri')) {
		return new Response('', { status: 400 })
	}

	let redirect_uri = decodeURIComponent(url.searchParams.get('redirect_uri') || '')
	if (redirect_uri.startsWith('/')) {
		// URL is a relative URL, prepend the domain to it.
		redirect_uri = 'https://' + url.hostname + redirect_uri
	}
	return Response.redirect(redirect_uri, 302)
}
