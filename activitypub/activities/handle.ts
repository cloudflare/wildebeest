import * as actors from 'wildebeest/activitypub/actors/'
import { actorURL } from 'wildebeest/activitypub/actors/'
import * as objects from 'wildebeest/activitypub/objects/'
import * as accept from 'wildebeest/activitypub/activities/accept'
import { addObjectInInbox } from 'wildebeest/activitypub/actors/inbox'
import { insertNotification } from 'wildebeest/mastodon/notification'
import type { Object } from 'wildebeest/activitypub/objects/'
import { parseHandle } from 'wildebeest/utils/parse'
import { instanceConfig } from 'wildebeest/config/instance'
import type { Note } from 'wildebeest/activitypub/objects/note'
import { acceptFollowing, addFollowing } from 'wildebeest/activitypub/actors/follow'
import { deliver } from 'wildebeest/activitypub/deliver'
import { getSigningKey } from 'wildebeest/mastodon/account'
import type { Activity } from 'wildebeest/activitypub/activities/'

function extractID(s: string): string {
	return s.replace(`https://${instanceConfig.uri}/ap/users/`, '')
}

export type HandleResponse = {
	createdObjects: Array<Object>
}

export type HandleMode = 'caching' | 'inbox'

// FIXME: support Actor field in object or string forms. Same with Object field.
export async function handle(
	activity: Activity,
	db: D1Database,
	userKEK: string,
	mode: HandleMode
): Promise<HandleResponse> {
	const createdObjects: Array<Object> = []

	console.log(activity)
	switch (activity.type) {
		// https://www.w3.org/TR/activitypub/#create-activity-inbox
		case 'Create': {
			let recipients: Array<string> = []

			if (Array.isArray(activity.to)) {
				recipients = [...recipients, ...activity.to]
			}
			if (Array.isArray(activity.cc)) {
				recipients = [...recipients, ...activity.cc]
			}

			const obj = await createObject(activity.object, db)
			if (obj === null) {
				break
			}
			createdObjects.push(obj)

			if (mode === 'inbox') {
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

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-follow
		case 'Follow': {
			const receiver = await actors.getPersonById(db, activity.object)
			if (receiver !== null) {
				const originatingActor = await actors.getAndCache(new URL(activity.actor), db)
				const receiverAcct = `${receiver.preferredUsername}@${instanceConfig.uri}`
				await addFollowing(db, originatingActor, receiver, receiverAcct)
				await acceptFollowing(db, originatingActor, receiver)

				// Automatically send the Accept reply
				const reply = accept.create(receiver, activity)
				const signingKey = await getSigningKey(userKEK, db, receiver)
				await deliver(signingKey, receiver, originatingActor, reply)
			} else {
				console.warn(`actor ${activity.object} not found`)
			}

			break
		}

		default:
			console.warn(`Unsupported activity: ${activity.type}`)
	}

	return { createdObjects }
}

async function createObject(obj: Object, db: D1Database): Promise<Object | null> {
	switch (obj.type) {
		case 'Note': {
			// FIXME: ensure that the object isn't there yet
			// use the ID in properties
			return objects.createObject(db, 'Note', obj)
			break
		}

		default: {
			console.warn(`Unsupported Create object: ${obj.type}`)
			return null
		}
	}
}
