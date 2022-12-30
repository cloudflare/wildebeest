import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { Client } from './client'

export type PushSubscription = {
	endpoint: string
	keys: {
		p256dh: string
		auth: string
	}
}

export interface CreateRequest {
	subscription: PushSubscription
	data: {
		alerts: {
			mention?: boolean
			status?: boolean
			reblog?: boolean
			follow?: boolean
			follow_request?: boolean
			favourite?: boolean
			poll?: boolean
			update?: boolean
			admin_sign_up?: boolean
			admin_report?: boolean
		}
		policy: string
	}
}

export type Subscription = {
	id: string
	endpoint: string
}

export async function createSubscription(
	db: D1Database,
	actor: Actor,
	client: Client,
	req: CreateRequest
): Promise<Subscription> {
	const id = crypto.randomUUID()

	const query = `
          INSERT INTO subscriptions (id, actor_id, client_id, endpoint, key_p256dh, key_auth, alert_mention, alert_status, alert_reblog, alert_follow, alert_follow_request, alert_favourite, alert_poll, alert_update, alert_admin_sign_up, alert_admin_report, policy)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
	const out = await db
		.prepare(query)
		.bind(
			id,
			actor.id.toString(),
			client.id,
			req.subscription.endpoint,
			req.subscription.keys.p256dh,
			req.subscription.keys.auth,
			req.data.alerts.mention ? 1 : 0,
			req.data.alerts.status ? 1 : 0,
			req.data.alerts.reblog ? 1 : 0,
			req.data.alerts.follow ? 1 : 0,
			req.data.alerts.follow_request ? 1 : 0,
			req.data.alerts.favourite ? 1 : 0,
			req.data.alerts.poll ? 1 : 0,
			req.data.alerts.update ? 1 : 0,
			req.data.alerts.admin_sign_up ? 1 : 0,
			req.data.alerts.admin_report ? 1 : 0,
			req.data.policy
		)
		.run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}

	return { id, endpoint: req.subscription.endpoint }
}

export async function getSubscription(db: D1Database, actor: Actor, client: Client): Promise<Subscription | null> {
	const query = `
        SELECT * FROM subscriptions WHERE actor_id=? AND client_id=?
    `

	const { success, error, results } = await db.prepare(query).bind(actor.id.toString(), client.id).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}

	if (!results || results.length === 0) {
		return null
	}

	const row: any = results[0]
	return {
		id: row.id,
		endpoint: row.endpoint,
	}
}
