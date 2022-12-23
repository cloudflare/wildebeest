import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { Client } from './client'

export interface CreateRequest {
	endpoint: string
	key_p256dh: string
	key_auth: string
	alert_mention: boolean
	alert_status: boolean
	alert_reblog: boolean
	alert_follow: boolean
	alert_follow_request: boolean
	alert_favourite: boolean
	alert_poll: boolean
	alert_update: boolean
	alert_admin_sign_up: boolean
	alert_admin_report: boolean
	policy: string
}

export async function createSubscription(db: D1Database, actor: Actor, client: Client, req: CreateRequest) {
	const query = `
          INSERT INTO subscriptions (actor_id, client_id, endpoint, key_p256dh, key_auth, alert_mention, alert_status, alert_reblog, alert_follow, alert_follow_request, alert_favourite, alert_poll, alert_update, alert_admin_sign_up, alert_admin_report, policy)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`
	const out = await db
		.prepare(query)
		.bind(
			actor.id,
			client.id,
			req.endpoint,
			req.key_p256dh,
			req.key_auth,
			req.alert_mention ? 1 : 0,
			req.alert_status ? 1 : 0,
			req.alert_reblog ? 1 : 0,
			req.alert_follow ? 1 : 0,
			req.alert_follow_request ? 1 : 0,
			req.alert_favourite ? 1 : 0,
			req.alert_poll ? 1 : 0,
			req.alert_update ? 1 : 0,
			req.alert_admin_sign_up ? 1 : 0,
			req.alert_admin_report ? 1 : 0,
			req.policy
		)
		.run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}
