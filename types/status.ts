// https://docs.joinmastodon.org/entities/Status/
// https://github.com/mastodon/mastodon-android/blob/master/mastodon/src/main/java/org/joinmastodon/android/model/Status.java
import type { MastodonAccount } from './account'

type Visibility = 'public' | 'unlisted' | 'private' | 'direct'

export type MastodonStatus = {
	id: string
	uri: URL
	created_at: string
	account: MastodonAccount
	content: string
	visibility: Visibility
	spoiler_text: string
	emojis: Array<any>
	media_attachments: Array<any>
	mentions: Array<any>
	tags: Array<any>
	favourites_count?: number
	reblogs_count?: number
	reblog?: MastodonStatus
	edited_at?: string
}
