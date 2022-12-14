import * as actors from 'wildebeest/activitypub/actors/'
import * as objects from 'wildebeest/activitypub/objects/'
import { addObjectInInbox } from 'wildebeest/activitypub/actors/inbox'
import type { Object } from 'wildebeest/activitypub/objects/'
import { parseHandle } from 'wildebeest/utils/parse'
import { instanceConfig } from 'wildebeest/config/instance'

export type Activity = any

function extractID(s: string): string {
    return s.replace(`https://${instanceConfig.uri}/ap/users/`, '')
}

export async function handle(activity: Activity, db: D1Database) {
    console.log(activity)
    switch (activity.type) {
        // https://www.w3.org/TR/activitypub/#create-activity-inbox
        case 'Create': {
            const recipients = [...activity.to, ...activity.cc]

            for (let i = 0, len = recipients.length; i < len; i++) {
                const handle = parseHandle(extractID(recipients[i]))
                if (handle.domain !== null && handle.domain !== instanceConfig.uri) {
                    console.warn('activity not for current instance')
                    continue
                }

                const person = await actors.getPersonById(db, handle.localPart)
                if (person === null) {
                    console.warn(`person ${recipients[i]} not found`)
                    continue
                }

                const obj = await createObject(activity.object, db)
                if (obj !== null) {
                    console.log({ obj })
                    await addObjectInInbox(db, person, obj)
                }
            }

            break
        }

        default:
            console.warn(`Unsupported activity: ${activity.type}`)
    }
}

async function createObject(obj: Object, db: D1Database): Promise<Object | null> {
    switch (obj.type) {
        case 'Note': {
            const note = obj as objects.Note
            return objects.createNote(db, note.content)
            break
        }

        default: {
            console.warn(`Unsupported Create object: ${obj.type}`)
            return null
        }
    }
}
