import type { MediaAttachment, MastodonStatus } from '~/types'
import { generateDummyStatus } from './generateDummyStatus'
import { ben, george, penny, rafael, zak } from './accounts'

// Raw statuses which follow the precise structure found mastodon does
const mastodonRawStatuses: MastodonStatus[] = [
	generateDummyStatus({
		content: `
		<p>Fine. I'll use Wildebeest!</p>
		<p>It does look interesting:
			<a href="https://blog.cloudflare.com/welcome-to-wildebeest-the-fediverse-on-cloudflare/"
				target="_blank"
				rel="nofollow noopener noreferrer">
					<span class="invisible">https://</span>
					<span class="ellipsis">blog.cloudflare.com/welcome-to</span>
					<span class="invisible">-wildebeest-the-fediverse-on-cloudflare/</span>
			</a>
		</p>`,
		account: george,
	}),
	generateDummyStatus({
		content: 'We did it!',
		account: george,
		mediaAttachments: [
			generateDummyMediaImage(`https:/loremflickr.com/640/480/victory?lock=${Math.round(Math.random() * 999999)}`),
		],
	}),
	generateDummyStatus({
		content: '<span>A very simple update: all good!</span>',
		account: ben,
	}),
	generateDummyStatus({ content: '<p>Hi! My name is Rafael! 👋</p>', account: rafael, spoiler_text: 'who am I?' }),
	generateDummyStatus({
		content: "<div><p>I'm Rafael and I am a web designer!</p><p>💪💪</p></div>",
		account: rafael,
		mediaAttachments: new Array(4)
			.fill(null)
			.map((_, idx) => generateDummyMediaImage(`https:/loremflickr.com/640/480/abstract?lock=${100 + idx}`)),
	}),
]

export const statuses: MastodonStatus[] = mastodonRawStatuses.map((rawStatus) => ({
	...rawStatus,
	media_attachments: rawStatus.media_attachments.map((mediaAttachment) => ({
		...mediaAttachment,
		type: getStandardMediaType(mediaAttachment.type),
	})),
}))

export const replies: MastodonStatus[] = [
	generateDummyStatus({ content: '<p>Yes we did! 🎉</p>', account: zak, inReplyTo: statuses[1].id }),
	generateDummyStatus({ content: '<p> Yes you guys did it! </p>', account: penny, inReplyTo: statuses[1].id }),
]

export const reblogs: MastodonStatus[] = [generateDummyStatus({ account: george, reblog: statuses[2] })]

function getStandardMediaType(mediaAttachmentMastodonType: string): string {
	switch (mediaAttachmentMastodonType) {
		case 'image':
			return 'Image'
		case 'video':
			return 'Video'
	}
	return mediaAttachmentMastodonType
}

function generateDummyMediaImage(imageUrl: string): MediaAttachment {
	return {
		id: `${Math.random() * 9999999}`.padStart(3, '7'),
		type: 'image',
		url: imageUrl,
		preview_url: imageUrl,
		remote_url: null,
		preview_remote_url: null,
		text_url: null,
		meta: {
			original: {
				width: 1821,
				height: 1138,
				size: '1821x1138',
				aspect: 1.6001757469244289,
			},
			small: {
				width: 606,
				height: 379,
				size: '606x379',
				aspect: 1.5989445910290236,
			},
			focus: {
				x: 0.0,
				y: 0.0,
			},
		},
		description: 'A dummy image',
		blurhash: '',
	}
}
