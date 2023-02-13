import type { MastodonStatus } from 'wildebeest/frontend/src/types'

/**
 * generates a function that creates mock statuses when called,
 * it uses a closure to keep track of the number of generated
 * statuses to that they are consistently enumerated
 * ('Mock Fetched Status #000', 'Mock Fetched Status #001', ...)
 */
export function getMockStatusFn(): () => MastodonStatus {
	let numOfGeneratedMockStatuses = 0
	return () => {
		const paddedNum = `${numOfGeneratedMockStatuses}`.padStart(3, '0')
		const status: MastodonStatus = {
			id: `mock-fetch-status-${paddedNum}`,
			created_at: new Date().toISOString(),
			in_reply_to_id: null,
			in_reply_to_account_id: null,
			sensitive: false,
			spoiler_text: '',
			visibility: 'public',
			language: 'en',
			uri: '',
			url: '',
			replies_count: 0,
			reblogs_count: 0,
			favourites_count: 0,
			edited_at: null,
			content: `Mock Fetched Status #${paddedNum}`,
			reblog: null,
			account: {
				id: '109355700962815786',
				username: 'georgetakei',
				acct: 'georgetakei@universeodon.com',
				display_name: 'George Takei 🏳️‍🌈🖖🏽',
				locked: false,
				bot: false,
				discoverable: true,
				group: false,
				created_at: '2022-11-15T00:00:00.000Z',
				note: '\u003cp\u003eI boldly went to this new site. Follow for more recipes and tips.\u003c/p\u003e',
				url: 'https://universeodon.com/@georgetakei',
				avatar:
					'https://files.mastodon.social/cache/accounts/avatars/109/355/700/962/815/786/original/7d278db7224de27d.jpg',
				avatar_static:
					'https://files.mastodon.social/cache/accounts/avatars/109/355/700/962/815/786/original/7d278db7224de27d.jpg',
				header:
					'https://files.mastodon.social/cache/accounts/headers/109/355/700/962/815/786/original/01c05d0b46e15480.jpg',
				header_static:
					'https://files.mastodon.social/cache/accounts/headers/109/355/700/962/815/786/original/01c05d0b46e15480.jpg',
				followers_count: 331437,
				following_count: 37,
				statuses_count: 187,
				last_status_at: '2023-01-04',
				emojis: [],
				fields: [],
			},
			media_attachments: [],
			mentions: [],
			tags: [],
			emojis: [],
			card: null,
			poll: null,
		}
		numOfGeneratedMockStatuses++
		return status
	}
}
