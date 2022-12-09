// https://www.w3.org/TR/activitystreams-vocabulary/#object-types

import { instanceConfig } from 'wildebeest/config/instance'

const NOTE = 'Note'

// TODO: any way to get TS typing from SQL tables?
export async function createNote(db: D1Database, content: string): Promise<any> {
    const id = crypto.randomUUID()

    const properties = {
        content,
    }

    return await db
        .prepare('INSERT INTO objects(id, type, properties) VALUES(?, ?, ?) RETURNING *')
        .bind(id, NOTE, JSON.stringify(properties))
        .first()
}
