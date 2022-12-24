import type { MediaAttachment } from 'wildebeest/backend/src/types/media'
import type { Document } from 'wildebeest/backend/src/activitypub/objects'
import { IMAGE } from 'wildebeest/backend/src/activitypub/objects/image'
import type { Object } from 'wildebeest/backend/src/activitypub/objects'

export function fromObject(obj: Object): MediaAttachment {
	if (obj.type === IMAGE) {
		return fromObjectImage(obj)
	} else if (obj.type === 'Document') {
		if (obj.mediaType === 'image/jpeg') {
			return fromObjectImage(obj)
		} else {
			throw new Error(`unsupported media type ${obj.type}: ${JSON.stringify(obj)}`)
		}
	} else {
		throw new Error(`unsupported media type ${obj.type}: ${JSON.stringify(obj)}`)
	}
}

function fromObjectImage(obj: Object): MediaAttachment {
	return {
		url: new URL(obj.url),
		id: obj.mastodonId || obj.url.toString(),
		preview_url: new URL(obj.url),
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
}
