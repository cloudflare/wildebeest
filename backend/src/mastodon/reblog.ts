// Also known as boost.

import type { Object } from 'wildebeest/backend/src/activitypub/objects'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'

export async function insertReblog(db: D1Database, actor: Actor, obj: Object) {
	const id = crypto.randomUUID()

	const query = `
          INSERT INTO actor_reblogs (id, actor_id, object_id)
          VALUES (?, ?, ?)
`
	const out = await db.prepare(query).bind(id, actor.id, obj.id).run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}

export async function getReblogs(db: D1Database, obj: Object): Promise<Array<string>> {
	const query = `
        SELECT actor_id FROM actor_reblogs WHERE object_id=?
    `

	const out: any = await db.prepare(query).bind(obj.id).all()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}

	if (out.results !== null) {
		return out.results.map((x: any) => x.actor_id)
	} else {
		return []
	}
}
