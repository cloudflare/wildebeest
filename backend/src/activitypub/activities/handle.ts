import * as actors from 'wildebeest/backend/src/activitypub/actors'
import { PUBLIC_GROUP } from 'wildebeest/backend/src/activitypub/activities'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import { addObjectInOutbox } from 'wildebeest/backend/src/activitypub/actors/outbox'
import { actorURL } from 'wildebeest/backend/src/activitypub/actors'
import * as objects from 'wildebeest/backend/src/activitypub/objects'
import * as accept from 'wildebeest/backend/src/activitypub/activities/accept'
import { addObjectInInbox } from 'wildebeest/backend/src/activitypub/actors/inbox'
import {
	sendMentionNotification,
	sendLikeNotification,
	sendFollowNotification,
	createNotification,
	insertFollowNotification,
	sendReblogNotification,
} from 'wildebeest/backend/src/mastodon/notification'
import { type APObject, updateObject } from 'wildebeest/backend/src/activitypub/objects'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import type { Note } from 'wildebeest/backend/src/activitypub/objects/note'
import { addFollowing, acceptFollowing, moveFollowers, moveFollowing } from 'wildebeest/backend/src/mastodon/follow'
import { deliverToActor } from 'wildebeest/backend/src/activitypub/deliver'
import { getSigningKey } from 'wildebeest/backend/src/mastodon/account'
import { insertLike } from 'wildebeest/backend/src/mastodon/like'
import { createReblog } from 'wildebeest/backend/src/mastodon/reblog'
import { insertReply } from 'wildebeest/backend/src/mastodon/reply'
import type { Activity } from 'wildebeest/backend/src/activitypub/activities'
import { originalActorIdSymbol, deleteObject } from 'wildebeest/backend/src/activitypub/objects'
import { hasReblog } from 'wildebeest/backend/src/mastodon/reblog'
import { getMetadata, loadItems } from 'wildebeest/backend/src/activitypub/objects/collection'
import { type Database } from 'wildebeest/backend/src/database'

function extractID(domain: string, s: string | URL): string {
	return s.toString().replace(`https://${domain}/ap/users/`, '')
}

export function makeGetObjectAsId(activity: Activity) {
	return () => {
		let url: any = null
		if (activity.object.id !== undefined) {
			url = activity.object.id
		}
		if (typeof activity.object === 'string') {
			url = activity.object
		}
		if (activity.object instanceof URL) {
			// This is used for testing only.
			return activity.object as URL
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
}

export function makeGetActorAsId(activity: Activity) {
	return () => {
		let url: any = null
		if (activity.actor.id !== undefined) {
			url = activity.actor.id
		}
		if (typeof activity.actor === 'string') {
			url = activity.actor
		}
		if (activity.actor instanceof URL) {
			// This is used for testing only.
			return activity.actor as URL
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
}

export async function handle(
	domain: string,
	activity: Activity,
	db: Database,
	userKEK: string,
	adminEmail: string,
	vapidKeys: JWK
) {
	// The `object` field of the activity is required to be an object, with an
	// `id` and a `type` field.
	const requireComplexObject = () => {
		if (typeof activity.object !== 'object') {
			throw new Error('`activity.object` must be of type object')
		}
	}

	const getObjectAsId = makeGetObjectAsId(activity)
	const getActorAsId = makeGetActorAsId(activity)

	switch (activity.type) {
		case 'Update': {
			requireComplexObject()
			const actorId = getActorAsId()
			const objectId = getObjectAsId()

			if (!['Note', 'Person', 'Service'].includes(activity.object.type)) {
				console.warn('unsupported Update for Object type: ' + activity.object.type)
				return
			}

			// check current object
			const object = await objects.getObjectBy(db, objects.ObjectByKey.originalObjectId, objectId.toString())
			if (object === null) {
				throw new Error(`object ${objectId} does not exist`)
			}

			if (actorId.toString() !== object[originalActorIdSymbol]) {
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
			let target = PUBLIC_GROUP

			if (Array.isArray(activity.to) && activity.to.length > 0) {
				recipients = [...recipients, ...activity.to]

				if (activity.to.length !== 1) {
					console.warn("multiple `Activity.to` isn't supported")
				}
				target = activity.to[0]
			}
			if (Array.isArray(activity.cc) && activity.cc.length > 0) {
				recipients = [...recipients, ...activity.cc]
			}

			const objectId = getObjectAsId()
			const res = await cacheObject(domain, activity.object, db, actorId, objectId)
			if (res === null) {
				break
			}

			if (!res.created) {
				// Object already existed in our database. Probably a duplicated
				// message
				break
			}
			const obj = res.object

			const actor = await actors.getAndCache(actorId, db)

			// This note is actually a reply to another one, record it in the replies
			// table.
			if (obj.type === 'Note' && obj.inReplyTo) {
				const inReplyToObjectId = new URL(obj.inReplyTo)
				let inReplyToObject = await objects.getObjectByOriginalId(db, inReplyToObjectId)

				if (inReplyToObject === null) {
					const remoteObject = await objects.get(inReplyToObjectId)
					const res = await objects.cacheObject(domain, db, remoteObject, actorId, inReplyToObjectId, false)
					inReplyToObject = res.object
				}

				await insertReply(db, actor, obj, inReplyToObject)
			}

			const fromActor = await actors.getAndCache(getActorAsId(), db)
			// Add the object in the originating actor's outbox, allowing other
			// actors on this instance to see the note in their timelines.
			await addObjectInOutbox(db, fromActor, obj, activity.published, target)

			for (let i = 0, len = recipients.length; i < len; i++) {
				const url = new URL(recipients[i])
				if (url.hostname !== domain) {
					console.warn('recipients is not for this instance')
					continue
				}

				const handle = parseHandle(extractID(domain, recipients[i]))
				if (handle.domain !== null && handle.domain !== domain) {
					console.warn('activity not for current instance')
					continue
				}

				const person = await actors.getActorById(db, actorURL(domain, handle.localPart))
				if (person === null) {
					console.warn(`person ${recipients[i]} not found`)
					continue
				}

				// FIXME: check if the actor mentions the person
				const notifId = await createNotification(db, 'mention', person, fromActor, obj)
				await Promise.all([
					await addObjectInInbox(db, person, obj),
					await sendMentionNotification(db, fromActor, person, notifId, adminEmail, vapidKeys),
				])
			}

			break
		}

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-accept
		case 'Accept': {
			requireComplexObject()
			const actorId = getActorAsId()

			const actor = await actors.getActorById(db, activity.object.actor)
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

			const receiver = await actors.getActorById(db, objectId)
			if (receiver !== null) {
				const originalActor = await actors.getAndCache(new URL(actorId), db)
				const receiverAcct = `${receiver.preferredUsername}@${domain}`

				await addFollowing(db, originalActor, receiver, receiverAcct)

				// Automatically send the Accept reply
				await acceptFollowing(db, originalActor, receiver)
				const reply = accept.create(receiver, activity)
				const signingKey = await getSigningKey(userKEK, db, receiver)
				await deliverToActor(signingKey, receiver, originalActor, reply, domain)

				// Notify the user
				const notifId = await insertFollowNotification(db, receiver, originalActor)
				await sendFollowNotification(db, originalActor, receiver, notifId, adminEmail, vapidKeys)
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

					const res = await cacheObject(domain, remoteObject, db, actorId, objectId)
					if (res === null) {
						break
					}
					obj = res.object
				} catch (err: any) {
					console.warn(`failed to retrieve object ${objectId}: ${err.message}`)
					break
				}
			} else {
				// Object already exists locally, we can just use it.
				obj = localObject
			}

			const fromActor = await actors.getAndCache(actorId, db)

			if (await hasReblog(db, fromActor, obj)) {
				// A reblog already exists. To avoid dulicated reblog we ignore.
				console.warn('probably duplicated Announce message')
				break
			}

			// notify the user
			const targetActor = await actors.getActorById(db, new URL(obj[originalActorIdSymbol]))
			if (targetActor === null) {
				console.warn('object actor not found')
				break
			}

			const notifId = await createNotification(db, 'reblog', targetActor, fromActor, obj)

			await Promise.all([
				createReblog(db, fromActor, obj),
				sendReblogNotification(db, fromActor, targetActor, notifId, adminEmail, vapidKeys),
			])

			break
		}

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-like
		case 'Like': {
			const actorId = getActorAsId()
			const objectId = getObjectAsId()

			const obj = await objects.getObjectById(db, objectId)
			if (obj === null || !obj[originalActorIdSymbol]) {
				console.warn('unknown object')
				break
			}

			const fromActor = await actors.getAndCache(actorId, db)
			const targetActor = await actors.getActorById(db, new URL(obj[originalActorIdSymbol]))
			if (targetActor === null) {
				console.warn('object actor not found')
				break
			}

			const [notifId] = await Promise.all([
				// Notify the user
				createNotification(db, 'favourite', targetActor, fromActor, obj),
				// Store the like for counting
				insertLike(db, fromActor, obj),
			])

			await sendLikeNotification(db, fromActor, targetActor, notifId, adminEmail, vapidKeys)
			break
		}

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-delete
		case 'Delete': {
			const objectId = getObjectAsId()
			const actorId = getActorAsId()

			const obj = await objects.getObjectByOriginalId(db, objectId)
			if (obj === null || !obj[originalActorIdSymbol]) {
				console.warn('unknown object or missing originalActorId')
				break
			}

			if (actorId.toString() !== obj[originalActorIdSymbol]) {
				console.warn(`authorized Delete (${actorId} vs ${obj[originalActorIdSymbol]})`)
				return
			}

			if (!['Note'].includes(obj.type)) {
				console.warn('unsupported Update for Object type: ' + activity.object.type)
				return
			}

			await deleteObject(db, obj)
			break
		}

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-move
		case 'Move': {
			const fromActorId = getActorAsId()
			const target = new URL(activity.target)

			if (target.hostname !== domain) {
				console.warn("Moving actor isn't local")
				break
			}

			const fromActor = await actors.getAndCache(fromActorId, db)

			const localActor = await actors.getActorById(db, target)
			if (localActor === null) {
				console.warn(`actor ${target} not found`)
				break
			}

			// FIXME: Requires alsoKnownAs to be set in both directions

			// move followers
			{
				const collection = await getMetadata(fromActor.followers)
				collection.items = await loadItems<string>(collection)

				// TODO: eventually move to queue and move workers
				while (collection.items.length > 0) {
					const batch = collection.items.splice(0, 20)
					await moveFollowers(db, localActor, batch)
					console.log(`moved ${batch.length} followers`)
				}
			}

			// move following
			{
				const collection = await getMetadata(fromActor.following)
				collection.items = await loadItems<string>(collection)

				// TODO: eventually move to queue and move workers
				while (collection.items.length > 0) {
					const batch = collection.items.splice(0, 20)
					await moveFollowing(db, localActor, batch)
					console.log(`moved ${batch.length} following`)
				}
			}

			break
		}

		default:
			console.warn(`Unsupported activity: ${activity.type}`)
	}
}

async function cacheObject(
	domain: string,
	obj: APObject,
	db: Database,
	originalActorId: URL,
	originalObjectId: URL
): Promise<{ created: boolean; object: APObject } | null> {
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
