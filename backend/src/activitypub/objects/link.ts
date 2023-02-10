import type { APObject } from 'wildebeest/backend/src/activitypub/objects'

export interface Link extends APObject {
	href: URL
	name: string
}
