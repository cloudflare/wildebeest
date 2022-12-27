import * as objects from '.'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'

export const IMAGE = 'Image'

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-image
export interface Image extends objects.Document {}

export async function createImage(domain: string, db: D1Database, actor: Actor, properties: any): Promise<Image> {
	const actorId = new URL(actor.id)
	return (await objects.createObject(domain, db, IMAGE, properties, actorId, true)) as Image
}
