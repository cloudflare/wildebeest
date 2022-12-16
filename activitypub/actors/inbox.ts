import type { Object } from 'wildebeest/activitypub/objects/'
import type { Actor } from 'wildebeest/activitypub/actors/'

export async function addObjectInInbox(db: D1Database, actor: Actor, obj: Object) {
    const id = crypto.randomUUID()
    const out = await db
        .prepare('INSERT INTO inbox_objects(id, actor_id, object_id) VALUES(?, ?, ?)')
        .bind(id, actor.id, obj.id)
        .run()
    if (!out.success) {
        throw new Error('SQL error: ' + out.error)
    }

    console.log({ out })
}