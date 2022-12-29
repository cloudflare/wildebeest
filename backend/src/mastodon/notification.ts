import type { Object } from 'wildebeest/backend/src/activitypub/objects'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import { generateWebPushMessage } from 'wildebeest/backend/src/webpush'
import type { WebPushInfos, WebPushMessage } from 'wildebeest/backend/src/webpush/webpushinfos'
import { WebPushResult } from 'wildebeest/backend/src/webpush/webpushinfos'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { NotificationType, Notification } from 'wildebeest/backend/src/types/notification'
import type { Subscription } from 'wildebeest/backend/src/mastodon/subscription'
import { getSubscriptionForAllClients } from 'wildebeest/backend/src/mastodon/subscription'
import { getVAPIDKeys } from 'wildebeest/backend/src/mastodon/subscription'
import * as config from 'wildebeest/backend/src/config'

export async function insertNotification(
	db: D1Database,
	type: NotificationType,
	actor: Actor,
	fromActor: Actor,
	obj: Object
) {
	const query = `
          INSERT INTO actor_notifications (type, actor_id, from_actor_id, object_id)
          VALUES (?, ?, ?, ?)
`
	const out = await db.prepare(query).bind(type, actor.id.toString(), fromActor.id.toString(), obj.id.toString()).run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}

export async function insertFollowNotification(db: D1Database, actor: Actor, fromActor: Actor) {
	const type: NotificationType = 'follow'

	const query = `
          INSERT INTO actor_notifications (type, actor_id, from_actor_id)
          VALUES (?, ?, ?)
`
	const out = await db.prepare(query).bind(type, actor.id.toString(), fromActor.id.toString()).run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}

export async function sendLikeNotification(db: D1Database, fromActor: Actor, actor: Actor) {
	const sub = await config.get(db, 'email')

	const data = {
		preferred_locale: 'en',
		notification_type: 'favourite',
		notification_id: Date.now() | 0,
		icon: fromActor.icon!.url,
		title: 'New favourite',
		body: `${fromActor.name} favourited your status`,
	}

	const message: WebPushMessage = {
		data: JSON.stringify(data),
		urgency: 'normal',
		sub,
		ttl: 60 * 24 * 7,
	}

	const subscriptions = await getSubscriptionForAllClients(db, actor)

	await Promise.all(subscriptions.map((s) => sendNotification(db, s, message)))
}

async function sendNotification(db: D1Database, subscription: Subscription, message: WebPushMessage) {
	const vapidKeys = await getVAPIDKeys(db)

	const device: WebPushInfos = {
		endpoint: subscription.gateway.endpoint,
		key: subscription.gateway.keys.p256dh,
		auth: subscription.gateway.keys.auth,
	}

	const result = await generateWebPushMessage(message, device, vapidKeys)
	if (result !== WebPushResult.Success) {
		throw new Error('failed to send push notification')
	}
}
