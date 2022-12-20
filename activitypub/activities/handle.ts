import * as actors from 'wildebeest/activitypub/actors/'
import { actorURL } from 'wildebeest/activitypub/actors/'
import * as objects from 'wildebeest/activitypub/objects/'
import type { Actor } from 'wildebeest/activitypub/actors/'
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

export async function handle(
	activity: Activity,
	db: D1Database,
	userKEK: string,
	mode: HandleMode
): Promise<HandleResponse> {
	const createdObjects: Array<Object> = []

	// The `object` field of the activity is required to be an object, with an
	// `id` and a `type` field.
	const requireComplexObject = () => {
		if (typeof activity.object !== 'object') {
			throw new Error('`activity.object` must be of type object')
		}
	}

	const getObjectAsId = () => {
		if (activity.object.id !== undefined) {
			return activity.object.id
		}
		if (typeof activity.object === 'string') {
			return activity.object
		}
		throw new Error('unknown value')
	}

	const getActorAsId = () => {
		if (activity.actor.id !== undefined) {
			return activity.actor.id
		}
		if (typeof activity.actor === 'string') {
			return activity.actor
		}
		throw new Error('unknown value')
	}

	console.log(activity)
	switch (activity.type) {
		// https://www.w3.org/TR/activitypub/#create-activity-inbox
		case 'Create': {
			requireComplexObject()
			const actorId = new URL(getActorAsId())

			let recipients: Array<string> = []

			if (Array.isArray(activity.to)) {
				recipients = [...recipients, ...activity.to]
			}
			if (Array.isArray(activity.cc)) {
				recipients = [...recipients, ...activity.cc]
			}

			const obj = await createObject(activity.object, db, actorId)
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

					const person = await actors.getPersonById(db, actorURL(handle.localPart))
					if (person === null) {
						console.warn(`person ${recipients[i]} not found`)
						continue
					}

					await addObjectInInbox(db, person, obj)
					const fromActor = await actors.getAndCache(new URL(getActorAsId()), db)
					await insertNotification(db, 'mention', person, fromActor, obj)
				}
			}

			break
		}

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-accept
		case 'Accept': {
			requireComplexObject()
			const actorId = getActorAsId()

			const actor = await actors.getPersonById(db, activity.object.actor)
			if (actor !== null) {
				const follower = await actors.getAndCache(new URL(actorId), db)
				await acceptFollowing(db, actor, follower)
			} else {
				console.warn(`actor ${activity.object.actor} not found`)
			}

			break
		}

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-follow
		case 'Follow': {
			const objectId = getObjectAsId()
			const actorId = getActorAsId()

			const receiver = await actors.getPersonById(db, objectId)
			if (receiver !== null) {
				const originalActorId = await actors.getAndCache(new URL(actorId), db)
				const receiverAcct = `${receiver.preferredUsername}@${instanceConfig.uri}`
				await addFollowing(db, originalActorId, receiver, receiverAcct)
				await acceptFollowing(db, originalActorId, receiver)

				// Automatically send the Accept reply
				const reply = accept.create(receiver, activity)
				const signingKey = await getSigningKey(userKEK, db, receiver)
				await deliver(signingKey, receiver, originalActorId, reply)
			} else {
				console.warn(`actor ${objectId} not found`)
			}

			break
		}

		default:
			console.warn(`Unsupported activity: ${activity.type}`)
	}

	return { createdObjects }
}

async function createObject(obj: Object, db: D1Database, originalActorId: URL): Promise<Object | null> {
	switch (obj.type) {
		case 'Note': {
			// FIXME: ensure that the object isn't there yet
			// use the ID in properties
			return objects.createObject(db, 'Note', obj, originalActorId)
			break
		}

		default: {
			console.warn(`Unsupported Create object: ${obj.type}`)
			return null
		}
	}
}
