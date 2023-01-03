import type { Object } from 'wildebeest/backend/src/activitypub/objects'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import { loadExternalMastodonAccount } from 'wildebeest/backend/src/mastodon/account'
import { generateWebPushMessage } from 'wildebeest/backend/src/webpush'
import { getPersonById } from 'wildebeest/backend/src/activitypub/actors'
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

export async function getNotifications(db: D1Database, actor: Actor): Promise<Array<Notification>> {
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
	const { results, success, error } = await stmt.all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	const out: Array<Notification> = []
	if (!results || results.length === 0) {
		return []
	}

	for (let i = 0, len = results.length; i < len; i++) {
		const result = results[i] as any
		const properties = JSON.parse(result.properties)
		const notifFromActorId = new URL(result.notif_from_actor_id)

		const notifFromActor = await getPersonById(db, notifFromActorId)
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
				created_at: new Date(result.cdate).toISOString(),

				emojis: [],
				media_attachments: [],
				tags: [],
				mentions: [],

				account,

				// TODO: stub values
				visibility: 'public',
				spoiler_text: '',
			}
		}

		out.push(notif)
	}

	return out
}

export async function pregenerateNotifications(db: D1Database, cache: KVNamespace, actor: Actor) {
	const notifications = await getNotifications(db, actor)
	await cache.put(actor.id + '/notifications', JSON.stringify(notifications))
}
