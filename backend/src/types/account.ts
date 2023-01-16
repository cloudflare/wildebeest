// https://docs.joinmastodon.org/entities/Account/
// https://github.com/mastodon/mastodon-android/blob/master/mastodon/src/main/java/org/joinmastodon/android/model/Account.java
export interface MastodonAccount {
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

	followers_count: number
	following_count: number
	statuses_count: number

	emojis: Array<any>
	fields: Array<Field>
}

// https://docs.joinmastodon.org/entities/Relationship/
// https://github.com/mastodon/mastodon-android/blob/master/mastodon/src/main/java/org/joinmastodon/android/model/Relationship.java
export type Relationship = {
	id: string
}

export type Privacy = 'public' | 'unlisted' | 'private' | 'direct'

// https://docs.joinmastodon.org/entities/Account/#CredentialAccount
export interface CredentialAccount extends MastodonAccount {
	source: {
		note: string
		fields: Array<Field>
		privacy: Privacy
		sensitive: boolean
		language: string
		follow_requests_count: number
	}
	role: Role
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

export type Field = {
	name: string
	value: string
	verified_at?: string
}
