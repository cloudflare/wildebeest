import * as actors from 'wildebeest/activitypub/actors/'
import { actorURL } from 'wildebeest/activitypub/actors/'
import * as objects from 'wildebeest/activitypub/objects/'
import { addObjectInInbox } from 'wildebeest/activitypub/actors/inbox'
import { insertNotification } from 'wildebeest/mastodon/notification'
import type { Object } from 'wildebeest/activitypub/objects/'
import { parseHandle } from 'wildebeest/utils/parse'
import { instanceConfig } from 'wildebeest/config/instance'
import { createNote } from 'wildebeest/activitypub/objects/note'
import type { Note } from 'wildebeest/activitypub/objects/note'
import { acceptFollowing } from 'wildebeest/activitypub/actors/follow'

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
            // FIXME: check that `to` matches the id in the URL

            for (let i = 0, len = recipients.length; i < len; i++) {
                const handle = parseHandle(extractID(recipients[i]))
                if (handle.domain !== null && handle.domain !== instanceConfig.uri) {
                    console.warn('activity not for current instance')
                    continue
                }

                const actorId = actorURL(handle.localPart)
                const person = await actors.getPersonById(db, actorId)
                if (person === null) {
                    console.warn(`person ${recipients[i]} not found`)
                    continue
                }

                const obj = await createObject(activity.object, db)
                if (obj !== null) {
                    await addObjectInInbox(db, person, obj)
                    const fromActor = await actors.getAndCache(new URL(activity.actor), db)
                    await insertNotification(db, 'mention', person, fromActor, obj)
                }
            }

            break
        }

        // https://www.w3.org/TR/activitystreams-vocabulary/#dfn-accept
        case 'Accept': {
            const actor = await actors.getPersonById(db, activity.object.actor)
            if (actor !== null) {
                const follower = await actors.getAndCache(new URL(activity.actor), db)
                await acceptFollowing(db, actor, follower)
            } else {
                console.warn(`actor ${activity.object.actor} not found`)
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
            const note = obj as Note
            return createNote(db, note.content)
            break
        }

        default: {
            console.warn(`Unsupported Create object: ${obj.type}`)
            return null
        }
    }
}
