// https://docs.joinmastodon.org/entities/Account/
// https://github.com/mastodon/mastodon-android/blob/master/mastodon/src/main/java/org/joinmastodon/android/model/Account.java
export type MastodonAccount = {
	id: string
	username: string
	acct: string
	url: string
	display_name: string
	note: string

	avatar: string
	avatar_static: string

	header: string
	header_static: string

	created_at: string

	locked?: boolean
	bot?: boolean
	discoverable?: boolean
	group?: boolean

	followers_count?: number
	following_count?: number
	statuses_count?: number

	emojis?: Array<any>
	fields?: Array<any>
}

// https://docs.joinmastodon.org/entities/Relationship/
// https://github.com/mastodon/mastodon-android/blob/master/mastodon/src/main/java/org/joinmastodon/android/model/Relationship.java
export type Relationship = {
	id: string
}