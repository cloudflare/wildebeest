// https://www.w3.org/TR/activitystreams-vocabulary/#object-types

import * as objects from './'
import { instanceConfig } from 'wildebeest/config/instance'

const NOTE = 'Note'

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-note
export interface Note extends objects.Object {
    content: string
}

// TODO: any way to get TS typing from SQL tables?
export async function createNote(db: D1Database, content: string): Promise<Note> {
    const id = crypto.randomUUID()

    const properties = {
        content,
    }

    const row: any = await db
        .prepare('INSERT INTO objects(id, type, properties) VALUES(?, ?, ?) RETURNING *')
        .bind(id, NOTE, JSON.stringify(properties))
        .first()

    return {
        type: NOTE,
        id: row.id,
        url: objects.uri(row.id),
        published: new Date(row.cdate).toISOString(),
        content,
    }
}
