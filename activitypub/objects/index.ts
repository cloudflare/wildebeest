import { instanceConfig } from 'wildebeest/config/instance'
import type { Actor } from 'wildebeest/activitypub/actors/'

// https://www.w3.org/TR/activitystreams-vocabulary/#object-types
export interface Object {
	type: string
	id: string
	url: URL
	published?: string
	icon?: Object
	image?: Object
	summary?: string
	name?: string
	mediaType?: string

	// Extension
	preferredUsername?: string
}

export function uri(id: string): URL {
	return new URL('/ap/o/' + id, 'https://' + instanceConfig.uri)
}

export async function createObject(
	db: D1Database,
	type: string,
	properties: any,
	originatingActor: URL
): Promise<Object> {
	const id = crypto.randomUUID()

	const row: any = await db
		.prepare('INSERT INTO objects(id, type, properties, originating_actor) VALUES(?, ?, ?, ?) RETURNING *')
		.bind(id, type, JSON.stringify(properties), originatingActor.toString())
		.first()

	return {
		...properties,
		type,
		id: row.id,
		url: uri(row.id),
		published: new Date(row.cdate).toISOString(),
	}
}
