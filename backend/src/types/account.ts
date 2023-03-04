import { CustomEmoji } from 'wildebeest/backend/src/types/custom_emoji'

// https://docs.joinmastodon.org/entities/Account/
// https://github.com/mastodon/mastodon-android/blob/master/mastodon/src/main/java/org/joinmastodon/android/model/Account.java
export interface MastodonAccount {
	id: string
	username: string
	acct: string
	url: string

	display_name: string
	note: MastodonHTML
	avatar: string
	avatar_static: string
	header: string
	header_static: string
	locked: boolean
	fields: Array<Field>
	emojis: Array<Emoji>

	bot: boolean
	group: boolean

	discoverable: boolean
	noindex?: boolean
	moved?: MastodonAccount
	suspended?: boolean
	limited?: boolean

	created_at: string
	last_status_at?: string
	statuses_count: number
	followers_count: number
	following_count: number
}

export type MastodonHTML = string
export type Emoji = CustomEmoji

// https://docs.joinmastodon.org/entities/Account/#Field
export type Field = {
	name: string
	value: string
	verified_at?: string
}

// https://docs.joinmastodon.org/entities/Account/#source-privacy
export type Privacy = 'public' | 'unlisted' | 'private' | 'direct'

// https://docs.joinmastodon.org/entities/Relationship/
// https://github.com/mastodon/mastodon-android/blob/master/mastodon/src/main/java/org/joinmastodon/android/model/Relationship.java
export type Relationship = {
	id: string
}

// https://docs.joinmastodon.org/entities/Account/#CredentialAccount
export interface CredentialAccount extends MastodonAccount {
	source: Source
	role: Role
}

// https://docs.joinmastodon.org/entities/Account/#source
export type Source = {
	note: string
	fields: Array<Field>
	privacy: Privacy
	sensitive: boolean
	language: string
	follow_requests_count: number
}

// https://docs.joinmastodon.org/entities/Role/
export type Role = {
	id: string
	name: string
	color: string
	position: number
	// https://docs.joinmastodon.org/entities/Role/#permission-flags
	permissions: number
	highlighted: boolean
	created_at: string
	updated_at: string
}

export interface MutedAccount extends MastodonAccount {
	mute_expires_at: string
}
