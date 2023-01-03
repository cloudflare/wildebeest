import * as actors from 'wildebeest/backend/src/activitypub/actors'
import { addObjectInOutbox } from 'wildebeest/backend/src/activitypub/actors/outbox'
import { actorURL } from 'wildebeest/backend/src/activitypub/actors'
import * as objects from 'wildebeest/backend/src/activitypub/objects'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import * as accept from 'wildebeest/backend/src/activitypub/activities/accept'
import { addObjectInInbox } from 'wildebeest/backend/src/activitypub/actors/inbox'
import {
	sendLikeNotification,
	insertNotification,
	insertFollowNotification,
} from 'wildebeest/backend/src/mastodon/notification'
import { type Object, updateObject } from 'wildebeest/backend/src/activitypub/objects'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import type { Note } from 'wildebeest/backend/src/activitypub/objects/note'
import { addFollowing, acceptFollowing } from 'wildebeest/backend/src/mastodon/follow'
import { deliverToActor } from 'wildebeest/backend/src/activitypub/deliver'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import { insertLike } from 'wildebeest/backend/src/mastodon/like'
import { insertReblog } from 'wildebeest/backend/src/mastodon/reblog'
import { insertReply } from 'wildebeest/backend/src/mastodon/reply'
import type { Activity } from 'wildebeest/backend/src/activitypub/activities'

function extractID(domain: string, s: string | URL): string {
	return s.toString().replace(`https://${domain}/ap/users/`, '')
}

export type HandleResponse = {
	createdObjects: Array<Object>
}

export type HandleMode = 'caching' | 'inbox'

export async function handle(
	domain: string,
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
		let url: any = null
		if (activity.object.id !== undefined) {
			url = activity.object.id
		}
		if (typeof activity.object === 'string') {
			url = activity.object
		}
		if (activity.object instanceof URL) {
			// This is used for testing only.
			return activity.object
		}
		if (url === null) {
			throw new Error('unknown value: ' + JSON.stringify(activity.object))
		}

		try {
			return new URL(url)
		} catch (err) {
			console.warn('invalid URL: ' + url)
			throw err
		}
	}

	const getActorAsId = () => {
		let url: any = null
		if (activity.actor.id !== undefined) {
			url = activity.actor.id
		}
		if (typeof activity.actor === 'string') {
			url = activity.actor
		}
		if (activity.actor instanceof URL) {
			// This is used for testing only.
			return activity.actor
		}
		if (url === null) {
			throw new Error('unknown value: ' + JSON.stringify(activity.actor))
		}

		try {
			return new URL(url)
		} catch (err) {
			console.warn('invalid URL: ' + url)
			throw err
		}
	}

	console.log(activity)
	switch (activity.type) {
		case 'Update': {
			requireComplexObject()
			const actorId = getActorAsId()
			const objectId = getObjectAsId()

			// check current object
			const object = await objects.getObjectBy(db, 'original_object_id', objectId.toString())
			if (object === null) {
				throw new Error(`object ${objectId} does not exist`)
			}

			if (actorId.toString() !== object.originalActorId) {
				throw new Error('actorid mismatch when updating object')
			}

			const updated = await updateObject(db, activity.object, object.id)
			if (!updated) {
				throw new Error('could not update object in database')
			}
			break
		}

		// https://www.w3.org/TR/activitypub/#create-activity-inbox
		case 'Create': {
			requireComplexObject()
			const actorId = getActorAsId()

			// FIXME: download any attachment Objects

			let recipients: Array<string> = []

			if (Array.isArray(activity.to)) {
				recipients = [...recipients, ...activity.to]
			}
			if (Array.isArray(activity.cc)) {
				recipients = [...recipients, ...activity.cc]
			}

			const objectId = getObjectAsId()
			const obj = await createObject(domain, activity.object, db, actorId, objectId)
			if (obj === null) {
				break
			}
			createdObjects.push(obj)

			const actor = await actors.getAndCache(actorId, db)

			// This note is actually a reply to another one, record it in the replies
			// table.
			if (obj.type === 'Note' && obj.inReplyTo) {
				const inReplyToObjectId = new URL(obj.inReplyTo)
				let inReplyToObject = await objects.getObjectByOriginalId(db, inReplyToObjectId)

				if (inReplyToObject === null) {
					const remoteObject = await objects.get(inReplyToObjectId)
					inReplyToObject = await objects.cacheObject(domain, db, remoteObject, actorId, inReplyToObjectId, false)
					createdObjects.push(inReplyToObject)
				}

				await insertReply(db, actor, obj, inReplyToObject)
			}

			const fromActor = await actors.getAndCache(getActorAsId(), db)
			// Add the object in the originating actor's outbox, allowing other
			// actors on this instance to see the note in their timelines.
			await addObjectInOutbox(db, fromActor, obj, activity.published)

			if (mode === 'inbox') {
				for (let i = 0, len = recipients.length; i < len; i++) {
					const handle = parseHandle(extractID(domain, recipients[i]))
					if (handle.domain !== null && handle.domain !== domain) {
						console.warn('activity not for current instance')
						continue
					}

					const person = await actors.getPersonById(db, actorURL(domain, handle.localPart))
					if (person === null) {
						console.warn(`person ${recipients[i]} not found`)
						continue
					}

					await addObjectInInbox(db, person, obj)
					// FIXME: check if the actor mentions the person
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
				const originalActor = await actors.getAndCache(new URL(actorId), db)
				const receiverAcct = `${receiver.preferredUsername}@${domain}`
				await addFollowing(db, originalActor, receiver, receiverAcct)
				await acceptFollowing(db, originalActor, receiver)

				// Automatically send the Accept reply
				const reply = accept.create(receiver, activity)
				const signingKey = await getSigningKey(userKEK, db, receiver)
				await deliverToActor(signingKey, receiver, originalActor, reply)

				// Notify the user
				await insertFollowNotification(db, receiver, originalActor)
			} else {
				console.warn(`actor ${objectId} not found`)
			}

			break
		}

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-announce
		case 'Announce': {
			const actorId = getActorAsId()
			const objectId = getObjectAsId()

			let obj: any = null

			const localObject = await objects.getObjectById(db, objectId)
			if (localObject === null) {
				try {
					// Object doesn't exists locally, we'll need to download it.
					const remoteObject = await objects.get<Note>(objectId)

					obj = await createObject(domain, remoteObject, db, actorId, objectId)
					if (obj === null) {
						break
					}
					createdObjects.push(obj)
				} catch (err: any) {
					console.warn(`failed to retrieve object ${objectId}: ${err.message}`)
					break
				}
			} else {
				// Object already exists locally, we can just use it.
				obj = localObject
			}

			const fromActor = await actors.getAndCache(actorId, db)

			await Promise.all([
				// Add the object in the originating actor's outbox, allowing other
				// actors on this instance to see the note in their timelines.
				addObjectInOutbox(db, fromActor, obj, activity.published),

				// Store the reblog for counting
				insertReblog(db, fromActor, obj),
			])
			break
		}

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-like
		case 'Like': {
			const actorId = getActorAsId()
			const objectId = getObjectAsId()

			const obj = await objects.getObjectById(db, objectId)
			if (obj === null || !obj.originalActorId) {
				console.warn('unknown object')
				break
			}

			const fromActor = await actors.getAndCache(actorId, db)
			const targetActor = await actors.getPersonById(db, new URL(obj.originalActorId))
			if (targetActor === null) {
				console.warn('object actor not found')
				break
			}

			await Promise.all([
				// Notify the user
				insertNotification(db, 'favourite', targetActor, fromActor, obj),
				// Store the like for counting
				insertLike(db, fromActor, obj),

				sendLikeNotification(db, fromActor, targetActor),
			])
			break
		}

		default:
			console.warn(`Unsupported activity: ${activity.type}`)
	}

	return { createdObjects }
}

async function createObject(
	domain: string,
	obj: Object,
	db: D1Database,
	originalActorId: URL,
	originalObjectId: URL
): Promise<Object | null> {
	switch (obj.type) {
		case 'Note': {
			return objects.cacheObject(domain, db, obj, originalActorId, originalObjectId, false)
		}

		default: {
			console.warn(`Unsupported Create object: ${obj.type}`)
			return null
		}
	}
}
