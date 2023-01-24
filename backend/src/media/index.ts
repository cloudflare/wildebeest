import type { MediaAttachment } from 'wildebeest/backend/src/types/media'
import type { Document } from 'wildebeest/backend/src/activitypub/objects'
import { IMAGE } from 'wildebeest/backend/src/activitypub/objects/image'
import type { APObject } from 'wildebeest/backend/src/activitypub/objects'

export function fromObject(obj: APObject): MediaAttachment {
	if (obj.type === IMAGE) {
		return fromObjectImage(obj)
	} else if (obj.type === 'Document') {
		return fromObjectDocument(obj as Document)
	} else {
		throw new Error(`unsupported media type ${obj.type}: ${JSON.stringify(obj)}`)
	}
}

export function fromObjectDocument(obj: Document): MediaAttachment {
	if (obj.mediaType === 'image/jpeg' || obj.mediaType === 'image/png') {
		return fromObjectImage(obj)
	} else if (obj.mediaType === 'video/mp4') {
		return {
			url: new URL(obj.url),
			preview_url: new URL(obj.url),
			id: obj.url.toString(),
			type: 'video',
			meta: {
				length: '0:01:28.65',
				duration: 88.65,
				fps: 24,
				size: '1280x720',
				width: 1280,
				height: 720,
				aspect: 1.7777777777777777,
				audio_encode: 'aac (LC) (mp4a / 0x6134706D)',
				audio_bitrate: '44100 Hz',
				audio_channels: 'stereo',
				original: {
					width: 1280,
					height: 720,
					frame_rate: '6159375/249269',
					duration: 88.654,
					bitrate: 862056,
				},
				small: {
					width: 400,
					height: 225,
					size: '400x225',
					aspect: 1.7777777777777777,
				},
			},
			description: 'test media description',
			blurhash: 'UFBWY:8_0Jxv4mx]t8t64.%M-:IUWGWAt6M}',
		}
	} else {
		throw new Error(`unsupported media Document type: ${JSON.stringify(obj)}`)
	}
}

function fromObjectImage(obj: APObject): MediaAttachment {
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
