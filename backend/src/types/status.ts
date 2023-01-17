import type { MastodonAccount } from './account'
import type { MediaAttachment } from './media'
import type { UUID } from 'wildebeest/backend/src/types'

export type Visibility = 'public' | 'unlisted' | 'private' | 'direct'

// https://docs.joinmastodon.org/entities/Status/
// https://github.com/mastodon/mastodon-android/blob/master/mastodon/src/main/java/org/joinmastodon/android/model/Status.java
export type MastodonStatus = {
	id: UUID
	uri: URL
	url: URL
	created_at: string
	account: MastodonAccount
	content: string
	visibility: Visibility
	spoiler_text: string
	emojis: Array<any>
	media_attachments: Array<MediaAttachment>
	mentions: Array<any>
	tags: Array<any>
	favourites_count?: number
	reblogs_count?: number
	reblog?: MastodonStatus
	edited_at?: string
	replies_count?: number
	reblogged?: boolean
	favourited?: boolean
	in_reply_to_id?: string
	in_reply_to_account_id?: string
}

// https://docs.joinmastodon.org/entities/Context/
export type Context = {
	ancestors: Array<MastodonStatus>
	descendants: Array<MastodonStatus>
}
