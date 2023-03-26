import type { InboxMessageBody } from 'wildebeest/backend/src/types/queue'
import { getDatabase } from 'wildebeest/backend/src/database'
import * as activityHandler from 'wildebeest/backend/src/activitypub/activities/handle'
import * as notification from 'wildebeest/backend/src/mastodon/notification'
import * as timeline from 'wildebeest/backend/src/mastodon/timeline'
import { cacheFromEnv } from 'wildebeest/backend/src/cache'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import type { Env } from './'

export async function handleInboxMessage(env: Env, actor: Actor, message: InboxMessageBody) {
	const domain = env.DOMAIN
	const db = await getDatabase(env)
	const adminEmail = env.ADMIN_EMAIL
	const cache = cacheFromEnv(env)
	const activity = message.activity
	console.log(JSON.stringify(activity))

	await activityHandler.handle(domain, activity, db, message.userKEK, adminEmail, message.vapidKeys)

	// Assuming we received new posts or a like, pregenerate the user's timelines
	// and notifications.
	await Promise.all([
		timeline.pregenerateTimelines(domain, db, cache, actor),
		notification.pregenerateNotifications(db, cache, actor, domain),
	])
}
