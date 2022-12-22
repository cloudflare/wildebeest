import { ContextData } from 'wildebeest/backend/src/types/context'
import { Env } from 'wildebeest/backend/src/types/env'

type AppsPost = {
	redirect_uris: string
	website: string
	client_name: string
	scopes: string
}

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	if (request.method !== 'POST') {
		return new Response('', { status: 400 })
	}

	const body = await request.json<AppsPost>()
	console.log(body)

	const res = {
		name: body.client_name,
		website: body.website,
		redirect_uri: body.redirect_uris,
		client_id: 'TWhM-tNSuncnqN7DBJmoyeLnk6K3iJJ71KKXxgL1hPM',
		client_secret: 'ZEaFUFmF0umgBX1qKJDjaU99Q31lDkOU8NutzTOoliw',
		vapid_key: 'BCk-QqERU0q-CfYZjcuB6lnyyOYfJ2AifKqfeGIm7Z-HiTU5T9eTG5GxVA0_OH5mMlI4UkkDTpaZwozy0TzdZ2M=',
	}
	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type',
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
