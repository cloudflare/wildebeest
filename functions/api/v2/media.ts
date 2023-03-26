import type { Env } from 'wildebeest/backend/src/types/env'
import { cors } from 'wildebeest/backend/src/utils/cors'
import { createImage } from 'wildebeest/backend/src/activitypub/objects/image'
import * as media from 'wildebeest/backend/src/media/image'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import type { MediaAttachment } from 'wildebeest/backend/src/types/media'
import type { Person } from 'wildebeest/backend/src/activitypub/actors'
import { mastodonIdSymbol } from 'wildebeest/backend/src/activitypub/objects'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'

export const onRequestPost: PagesFunction<Env, any, ContextData> = async ({ request, env, data }) => {
	return handleRequestPost(request, await getDatabase(env), data.connectedActor, env.CF_ACCOUNT_ID, env.CF_API_TOKEN)
}

export async function handleRequestPost(
	request: Request,
	db: Database,
	connectedActor: Person,

	accountId: string,
	apiToken: string
): Promise<Response> {
	const contentType = request.headers.get('content-type')
	if (contentType === null) {
		throw new Error('invalid request')
	}

	const config = { accountId, apiToken }
	const url = await media.uploadUserContent(request, config)

	const properties = {
		url,
	}
	const domain = new URL(request.url).hostname
	const image = await createImage(domain, db, connectedActor, properties)
	console.log({ image })

	const res: MediaAttachment = {
		id: image[mastodonIdSymbol]!,
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
		description: image.description || '',
		blurhash: 'UFBWY:8_0Jxv4mx]t8t64.%M-:IUWGWAt6M}',
	}

	const headers = {
		...cors(),
		'content-type': 'application/json; charset=utf-8',
	}
	return new Response(JSON.stringify(res), { headers })
}
