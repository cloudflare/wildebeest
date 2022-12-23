import { getClientById } from 'wildebeest/backend/src/mastodon/client'
import { createSubscription } from 'wildebeest/backend/src/mastodon/subscription'
import { ContextData } from 'wildebeest/backend/src/types/context'
import { Env } from 'wildebeest/backend/src/types/env'
import { HARDCODED_CLIENT_ID } from '../apps'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, params, data }) => {
	if (request.method !== 'POST') {
		return new Response('', { status: 400 }) // TODO, only creation for now
	}

	const client = await getClientById(env.DATABASE, HARDCODED_CLIENT_ID)
	if (client === null) {
		throw new Error(`client not found: ${HARDCODED_CLIENT_ID}`)
	}

	const actor = data.connectedActor

	//const subRes = await createSubscription(env.DATABASE, actor, client, {
	//	endpoint: formData.get(),
	//})

	// TODO
	// get actor

	// get subscription data
	const formData = await request.formData()

	// create subscription

	// return subscription
	const res = {
		id: 328183,
		endpoint: 'https://yourdomain.example/listener',
		alerts: {
			follow: true,
			favourite: true,
			reblog: true,
			mention: true,
			poll: true,
		},
		server_key: 'BCk-QqERU0q-CfYZjcuB6lnyyOYfJ2AifKqfeGIm7Z-HiTU5T9eTG5GxVA0_OH5mMlI4UkkDTpaZwozy0TzdZ2M=',
	}

	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type',
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
