import type { Person } from 'wildebeest/backend/src/activitypub/actors'

export type Identity = {
	email: string
}

export type ContextData = {
	// ActivityPub Person object of the logged in user
	connectedActor: Person

	// Object returned by Cloudflare Access' provider
	identity: Identity

	// Client or app identifier
	clientId: string
}
