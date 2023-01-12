import type { Env } from 'wildebeest/backend/src/types/env'
import { createImage } from 'wildebeest/backend/src/activitypub/objects/image'
import * as media from 'wildebeest/backend/src/media/image'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { MediaAttachment } from 'wildebeest/backend/src/types/media'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'

export const onRequest: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handleRequest(request, env.DATABASE, data.connectedActor, env.CF_ACCOUNT_ID, env.CF_API_TOKEN)
}

export async function handleRequest(
	request: Request,
	db: D1Database,
	connectedActor: Person,

	accountId: string,
	apiToken: string
): Promise<Response> {
	const formData = await request.formData()
	const domain = new URL(request.url).hostname

	if (!formData.has('file')) {
		return new Response('', { status: 400 })
	}

	const file = formData.get('file')! as any

	const config = { accountId, apiToken }
	const url = await media.uploadImage(file, config)

	const properties = {
		url,
	}
	const image = await createImage(domain, db, connectedActor, properties)
	console.log({ image })

	const res: MediaAttachment = {
		id: image.mastodonId!,
		url: image.url,
		preview_url: image.url,
		type: 'image',
		meta: {
			original: {
				width: 640,
				height: 480,
				size: '640x480',
				aspect: 1.3333333333333333,
			},
			small: {
				width: 461,
				height: 346,
				size: '461x346',
				aspect: 1.3323699421965318,
			},
			focus: {
				x: -0.27,
				y: 0.51,
			},
		},
		description: 'test media description',
		blurhash: 'UFBWY:8_0Jxv4mx]t8t64.%M-:IUWGWAt6M}',
	}

	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
		'Access-Control-Allow-Methods': 'POST',
		'content-type': 'application/json',
	}
	return new Response(JSON.stringify(res), { headers })
}
