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
import { parseHandle, Handle } from 'wildebeest/backend/src/utils/parse'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
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

export function makeGetObjectAsId(activity: Activity): () => URL | null {
	return () => {
		try {
			if (activity?.object?.id !== undefined) {
				return new URL(activity?.object?.id)
			} else if (typeof activity.object === 'string') {
				return new URL(activity.object)
			} else if (activity.object instanceof URL) {
				// This is used for testing only.
				return activity.object as URL
			} else {
				console.error(`makeGetObjectAsId | Unable to process Activity:\n${JSON.stringify(activity, null, 2)}`)
				return null
			}
		} catch {
			console.error(`Unable to extract APObject URL from Activity:\n${JSON.stringify(activity, null, 2)}`)
			return null
		}
	}
}

export function makeGetActorAsId(activity: Activity): () => URL | null {
	return () => {
		try {
			if (activity?.actor?.id !== undefined) {
				return new URL(activity.actor.id)
			} else if (typeof activity.actor === 'string') {
				return new URL(activity.actor)
			} else if (activity.actor instanceof URL) {
				// This is used for testing only.
				// console.warn(`TESTING PURPOSES ONLY`)
				return activity.actor as URL
			} else {
				console.error(`makeGetActorAsId | Unable to process Activity:\n${JSON.stringify(activity, null, 2)}`)
				return null
			}
		} catch {
			console.error(`Unable to extract APObject URL from Activity:\n${JSON.stringify(activity, null, 2)}`)
			return null
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

	switch (activity.type) {
		// https://www.w3.org/TR/activitypub/#create-activity-inbox
		case 'Create': {
			requireComplexObject()
			const actorId: URL | null = makeGetActorAsId(activity)()
			if (actorId === null) {
				throw new Error(`Activity type '${activity.type}' requires an actor with a valid ID`)
			}
			const objectId: URL | null = makeGetObjectAsId(activity)()
			if (objectId === null) {
				throw new Error(`Activity type '${activity.type}' requires an object with a valid ID`)
			}

			// FIXME: download any attachment Objects

			let recipients: Array<string> = []
			let target = PUBLIC_GROUP

			if (Array.isArray(activity.to) && activity.to.length > 0) {
				// TODO: Double-check that this is working as intended
				// because this syntax will silently fail if `recipients` or `activity.to` are multi-dimensional arrays
				// ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax#sect1
				recipients = [...recipients, ...activity.to]

				if (activity.to.length !== 1) {
					console.warn("multiple `Activity.to` isn't supported")
				}
				target = activity.to[0]
			}
			if (Array.isArray(activity.cc) && activity.cc.length > 0) {
				// TODO: Double-check that this is working as intended
				// because this syntax will silently fail if `recipients` or `activity.cc` are multi-dimensional arrays
				// ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax#sect1
				recipients = [...recipients, ...activity.cc]
			}

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
				const inReplyToObjectId: URL = new URL(obj.inReplyTo)
				let inReplyToObject = await objects.getObjectByOriginalId(db, inReplyToObjectId)

				if (inReplyToObject === null) {
					const remoteObject = await objects.get(inReplyToObjectId)
					const res = await objects.cacheObject(domain, db, remoteObject, actorId, inReplyToObjectId, false)
					inReplyToObject = res.object
				}

				await insertReply(db, actor, obj, inReplyToObject)
			}

			const fromActor = await actors.getAndCache(actorId, db)
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
			const actorId: URL | null = makeGetActorAsId(activity)()
			if (actorId === null) {
				throw new Error(`Activity type '${activity.type}' requires an actor with a valid ID`)
			}

			const actor = await actors.getActorById(db, activity.object.actor)
			if (actor !== null) {
				const follower = await actors.getAndCache(new URL(actorId), db)
				await acceptFollowing(db, actor, follower)
			} else {
				console.warn(`actor ${activity.object.actor} not found`)
			}

			break
		}

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-announce
		case 'Announce': {
			const announcingActorId: URL | null = makeGetActorAsId(activity)()
			if (announcingActorId === null) {
				throw new Error(`Activity type '${activity.type}' requires an actor with a valid ID`)
			}
			const announcedAPObjectId: URL | null = makeGetObjectAsId(activity)()
			if (announcedAPObjectId === null) {
				throw new Error(`Activity type '${activity.type}' requires an object with a valid ID`)
			}

			const announcingActor = await actors.getAndCache(announcingActorId, db)
			if (announcingActor === null) {
				const message: string = `Actor for 'Announce' does not exist or is inaccessible: '${announcingActorId}'`
				console.error(message)
				throw new Error(message)
			}
			const announcingActorHandle: Handle = parseHandle(urlToHandle(announcingActorId))
			if (announcingActorHandle.domain !== domain) {
				console.warn(
					`Actor for 'Announce' activity is not hosted locally: '${announcingActorHandle.localPart}@${announcingActorHandle.domain}'`
				)
				break
			}

			const announcedAPObject = activity.object
			if (announcedAPObject === null || announcedAPObject?.content === undefined) {
				// prettier-ignore
				const message: string = `'Announce' from '${announcingActorHandle.localPart}@${announcingActorHandle.domain}' contains an invalid APObject: '${JSON.stringify(activity.object, null, 2)}'`
				console.error(message)
				throw new Error(message)
			}

			let actorIdToNotify: URL
			let actorToNotify: any = null
			let objectToAnnounce: any = null

			const localObject = await objects.getObjectById(db, announcedAPObjectId)
			if (localObject === null) {
				console.debug(`Announced APObject is not cached locally, fetching '${announcedAPObjectId}' now ...`)
				try {
					// If original Actor doesn't exist locally, try to fetch it
					const originalActorId = new URL(announcedAPObject.attributedTo!)
					const originalActor = await actors.getAndCache(announcedAPObject.attributedTo, db)
					if (originalActor === null) {
						const message: string = `APObject in 'Announce' is attributed to an Actor that does not exist or is inaccessible: '${originalActorId}'`
						console.info(message)
						break
					}

					// Object doesn't exist locally, try to fetch it
					const remoteObject = await objects.get<Note>(announcedAPObjectId)

					const originalObjectId = remoteObject?.id as URL
					const res = await cacheObject(domain, remoteObject, db, originalActorId, originalObjectId)
					if (res === null) {
						break
					}
					actorIdToNotify = originalActorId
					actorToNotify = originalActor
					objectToAnnounce = res.object
				} catch (err: any) {
					console.warn(`failed to retrieve announced object (id: ${announcedAPObjectId}): ${err.message}`)
					break
				}
			} else {
				// Object already exists locally, we can just use it.
				actorIdToNotify = new URL(localObject[originalActorIdSymbol]!)
				actorToNotify = await actors.getAndCache(actorIdToNotify, db)
				if (actorToNotify === null) {
					const message: string = `APObject in 'Announce' is attributed to an Actor that does not exist or is inaccessible: '${actorIdToNotify}'`
					console.info(message)
					break
				}
				objectToAnnounce = localObject
			}

			if (await hasReblog(db, announcingActorId, objectToAnnounce?.id)) {
				// A reblog already exists. Ignore to avoid duplicated
				// prettier-ignore
				console.warn(`Ignoring reblog request from '${announcingActorId}' regarding ${objectToAnnounce?.type} authored by '${actorIdToNotify}' (id: ${objectToAnnounce?.id})'\nProbably duplicated Announce message`)
				break
			}

			try {
				await createReblog(db, announcingActor, objectToAnnounce)

				// prettier-ignore
				console.debug(`'${announcingActorId}' reblogged ${objectToAnnounce?.type} authored by '${actorIdToNotify}': ${objectToAnnounce?.id}'`)
			} catch (e: any) {
				// prettier-ignore
				console.error(`Unexpected error prevented Announce of ${objectToAnnounce?.type} (id: ${objectToAnnounce?.id}) by Actor '${announcingActorId}': ${JSON.stringify(e, null, 2)}\n'`)
				break
			}

			if (announcingActorId.toString() === actorIdToNotify.toString()) {
				// prettier-ignore
				console.trace(`Notification not sent because the sender (${announcingActorId}) and recipient (${actorIdToNotify}) are the same.`)
				break
			}

			try {
				const notifId = await createNotification(db, 'reblog', actorToNotify, announcingActor, objectToAnnounce)
				await sendReblogNotification(db, announcingActor, actorToNotify, notifId, adminEmail, vapidKeys)

				// prettier-ignore
				console.debug(`Notified Actor '${actorIdToNotify}' of ${objectToAnnounce?.type} '${announcedAPObjectId}' Announce (reblog) by Actor '${announcingActorId}'`)
				break
			} catch (e: any) {
				// prettier-ignore
				console.error(`Unexpected error prevented sending notification regarding Announce to attributed author: ${JSON.stringify(e, null, 2)}\n'`)
				break
			}

			throw new Error(`Unexpected error: this message should never be visible`)
			break
		}

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-delete
		case 'Delete': {
			const actorId: URL | null = makeGetActorAsId(activity)()
			if (actorId === null) {
				throw new Error(`Activity type '${activity.type}' requires an actor with a valid ID`)
			}
			const objectId: URL | null = makeGetObjectAsId(activity)()
			if (objectId === null) {
				throw new Error(`Activity type '${activity.type}' requires an object with a valid ID`)
			}

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
			const deleteOperationResult: string = await deleteObject(db, obj)

			if (deleteOperationResult !== 'success') {
				console.error(deleteOperationResult)
				throw new Error(deleteOperationResult)
			}

			break
		}

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-follow
		case 'Follow': {
			const actorId: URL | null = makeGetActorAsId(activity)()
			if (actorId === null) {
				throw new Error(`Activity type '${activity.type}' requires an actor with a valid ID`)
			}
			const objectId: URL | null = makeGetObjectAsId(activity)()
			if (objectId === null) {
				throw new Error(`Activity type '${activity.type}' requires an object with a valid ID`)
			}

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
				const m: string = `'${activity.type}' request failed because actor '${objectId}' was not found`
				console.error(m)
				throw new Error(m)
			}

			break
		}

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-like
		case 'Like': {
			const actorId: URL | null = makeGetActorAsId(activity)()
			if (actorId === null) {
				throw new Error(`Activity type '${activity.type}' requires an actor with a valid ID`)
			}
			const objectId: URL | null = makeGetObjectAsId(activity)()
			if (objectId === null) {
				throw new Error(`Activity type '${activity.type}' requires an object with a valid ID`)
			}

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

		// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-move
		case 'Move': {
			const actorId: URL | null = makeGetActorAsId(activity)()
			if (actorId === null) {
				throw new Error(`Activity type '${activity.type}' requires an actor with a valid ID`)
			}
			const target = new URL(activity.target)

			if (target.hostname !== domain) {
				console.warn("Moving actor isn't local")
				break
			}

			const fromActor = await actors.getAndCache(actorId, db)

			const localActor = await actors.getActorById(db, target)
			if (localActor === null) {
				console.warn(`actor ${target} not found`)
				break
			}

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

		case 'Update': {
			requireComplexObject()
			const actorId: URL | null = makeGetActorAsId(activity)()
			if (actorId === null) {
				console.error(`Activity type '${activity.type}' requires an actor with a valid ID`)
				throw new Error()
			}
			const objectId: URL | null = makeGetObjectAsId(activity)()
			if (objectId === null) {
				throw new Error(`Activity type '${activity.type}' requires an object with a valid ID`)
			}

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
