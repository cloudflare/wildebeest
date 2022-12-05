import type { Object } from 'wildebeest/backend/src/activitypub/objects'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'

export async function insertLike(db: D1Database, actor: Actor, obj: Object) {
	const id = crypto.randomUUID()

	const query = `
          INSERT INTO actor_favourites (id, actor_id, object_id)
          VALUES (?, ?, ?)
`
	const out = await db.prepare(query).bind(id, actor.id.toString(), obj.id.toString()).run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}

export async function getLikes(db: D1Database, obj: Object): Promise<Array<string>> {
	const query = `
        SELECT actor_id FROM actor_favourites WHERE object_id=?
    `

	const out: any = await db.prepare(query).bind(obj.id.toString()).all()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}

	if (out.results !== null) {
		return out.results.map((x: any) => x.actor_id)
	} else {
		return []
	}
}
