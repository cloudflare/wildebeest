import type { APObject } from 'wildebeest/backend/src/activitypub/objects'
import { type Database } from 'wildebeest/backend/src/database'
import { defaultImages } from 'wildebeest/config/accounts'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import { loadExternalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { generateWebPushMessage } from 'wildebeest/backend/src/webpush'
import { getActorById } from 'wildebeest/backend/src/activitypub/actors'
import type { WebPushInfos, WebPushMessage } from 'wildebeest/backend/src/webpush/webpushinfos'
import { WebPushResult } from 'wildebeest/backend/src/webpush/webpushinfos'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type {
	NotificationType,
	Notification,
	NotificationsQueryResult,
} from 'wildebeest/backend/src/types/notification'
import { getSubscriptionForAllClients } from 'wildebeest/backend/src/mastodon/subscription'
import type { Cache } from 'wildebeest/backend/src/cache'

export async function createNotification(
	db: Database,
	type: NotificationType,
	actor: Actor,
	fromActor: Actor,
	obj: APObject
): Promise<string> {
	const query = `
          INSERT INTO actor_notifications (type, actor_id, from_actor_id, object_id)
          VALUES (?, ?, ?, ?)
          RETURNING id
`
	const row = await db
		.prepare(query)
		.bind(type, actor.id.toString(), fromActor.id.toString(), obj.id.toString())
		.first<{ id: string }>()
	return row.id
}

export async function insertFollowNotification(db: Database, actor: Actor, fromActor: Actor): Promise<string> {
	const type: NotificationType = 'follow'

	const query = `
          INSERT INTO actor_notifications (type, actor_id, from_actor_id)
          VALUES (?, ?, ?)
          RETURNING id
`
	const row = await db.prepare(query).bind(type, actor.id.toString(), fromActor.id.toString()).first<{ id: string }>()
	return row.id
}

export async function sendFollowNotification(
	db: Database,
	follower: Actor,
	actor: Actor,
	notificationId: string,
	adminEmail: string,
	vapidKeys: JWK
) {
	let icon = new URL(defaultImages.avatar)
	if (follower.icon) {
		icon = follower.icon.url
	}

	const data = {
		preferred_locale: 'en',
		notification_type: 'follow',
		notification_id: notificationId,
		icon,
		title: 'New follower',
		body: `${follower.name} is now following you`,
	}

	const message: WebPushMessage = {
		data: JSON.stringify(data),
		urgency: 'normal',
		sub: adminEmail,
		ttl: 60 * 24 * 7,
	}

	return sendNotification(db, actor, message, vapidKeys)
}

export async function sendLikeNotification(
	db: Database,
	fromActor: Actor,
	actor: Actor,
	notificationId: string,
	adminEmail: string,
	vapidKeys: JWK
) {
	let icon = new URL(defaultImages.avatar)
	if (fromActor.icon) {
		icon = fromActor.icon.url
	}

	const data = {
		preferred_locale: 'en',
		notification_type: 'favourite',
		notification_id: notificationId,
		icon,
		title: 'New favourite',
		body: `${fromActor.name} favourited your status`,
	}

	const message: WebPushMessage = {
		data: JSON.stringify(data),
		urgency: 'normal',
		sub: adminEmail,
		ttl: 60 * 24 * 7,
	}

	return sendNotification(db, actor, message, vapidKeys)
}

export async function sendMentionNotification(
	db: Database,
	fromActor: Actor,
	actor: Actor,
	notificationId: string,
	adminEmail: string,
	vapidKeys: JWK
) {
	let icon = new URL(defaultImages.avatar)
	if (fromActor.icon) {
		icon = fromActor.icon.url
	}

	const data = {
		preferred_locale: 'en',
		notification_type: 'mention',
		notification_id: notificationId,
		icon,
		title: 'New mention',
		body: `You were mentioned by ${fromActor.name}`,
	}

	const message: WebPushMessage = {
		data: JSON.stringify(data),
		urgency: 'normal',
		sub: adminEmail,
		ttl: 60 * 24 * 7,
	}

	return sendNotification(db, actor, message, vapidKeys)
}

export async function sendReblogNotification(
	db: Database,
	fromActor: Actor,
	actor: Actor,
	notificationId: string,
	adminEmail: string,
	vapidKeys: JWK
) {
	let icon = new URL(defaultImages.avatar)
	if (fromActor.icon) {
		icon = fromActor.icon.url
	}

	const data = {
		preferred_locale: 'en',
		notification_type: 'reblog',
		notification_id: notificationId,
		icon,
		title: 'New boost',
		body: `${fromActor.name} boosted your status`,
	}

	const message: WebPushMessage = {
		data: JSON.stringify(data),
		urgency: 'normal',
		sub: adminEmail,
		ttl: 60 * 24 * 7,
	}

	return sendNotification(db, actor, message, vapidKeys)
}

async function sendNotification(db: Database, actor: Actor, message: WebPushMessage, vapidKeys: JWK) {
	const subscriptions = await getSubscriptionForAllClients(db, actor)

	const promises = subscriptions.map(async (subscription) => {
		const device: WebPushInfos = {
			endpoint: subscription.gateway.endpoint,
			key: subscription.gateway.keys.p256dh,
			auth: subscription.gateway.keys.auth,
		}

		const result = await generateWebPushMessage(message, device, vapidKeys)
		if (result !== WebPushResult.Success) {
			throw new Error('failed to send push notification')
		}
	})

	await Promise.allSettled(promises)
}

export async function getNotifications(db: Database, actor: Actor, domain: string): Promise<Array<Notification>> {
	const query = `
    SELECT
        objects.*,
        actor_notifications.type,
        actor_notifications.actor_id,
        actor_notifications.from_actor_id as notif_from_actor_id,
        actor_notifications.cdate as notif_cdate,
        actor_notifications.id as notif_id
    FROM actor_notifications
    LEFT JOIN objects ON objects.id=actor_notifications.object_id
    WHERE actor_id=?
    ORDER BY actor_notifications.cdate DESC
    LIMIT 20
  `

	const stmt = db.prepare(query).bind(actor.id.toString())
	const { results, success, error } = await stmt.all<NotificationsQueryResult>()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	const out: Array<Notification> = []
	if (!results || results.length === 0) {
		return []
	}

	for (let i = 0, len = results.length; i < len; i++) {
		const result = results[i]
		let properties
		if (typeof result.properties === 'object') {
			// neon uses JSONB for properties which is returned as a deserialized
			// object.
			properties = result.properties
		} else {
			// D1 uses a string for JSON properties
			properties = JSON.parse(result.properties)
		}
		const notifFromActorId = new URL(result.notif_from_actor_id)

		const notifFromActor = await getActorById(db, notifFromActorId)
		if (!notifFromActor) {
			console.warn('unknown actor')
			continue
		}

		const acct = urlToHandle(notifFromActorId)
		const notifFromAccount = await loadExternalMastodonAccount(acct, notifFromActor)

		const notif: Notification = {
			id: result.notif_id.toString(),
			type: result.type,
			created_at: new Date(result.notif_cdate).toISOString(),
			account: notifFromAccount,
		}

		if (result.type === 'mention' || result.type === 'favourite') {
			const actorId = new URL(result.original_actor_id)
			const actor = await actors.getAndCache(actorId, db)

			const acct = urlToHandle(actorId)
			const account = await loadExternalMastodonAccount(acct, actor)

			notif.status = {
				id: result.mastodon_id,
				content: properties.content,
				uri: result.id,
				url: new URL(`/@${actor.preferredUsername}/${result.mastodon_id}`, 'https://' + domain),
				created_at: new Date(result.cdate).toISOString(),

				account,

				// TODO: stub values
				emojis: [],
				media_attachments: [],
				tags: [],
				mentions: [],
				replies_count: 0,
				reblogs_count: 0,
				favourites_count: 0,
				visibility: 'public',
				spoiler_text: '',
			}
		}

		out.push(notif)
	}

	return out
}

export async function pregenerateNotifications(db: Database, cache: Cache, actor: Actor, domain: string) {
	const notifications = await getNotifications(db, actor, domain)
	await cache.put(actor.id + '/notifications', notifications)
}
