import type { Queue, MessageBody } from 'wildebeest/backend/src/types/queue'

export interface Env {
	DATABASE: D1Database
	KV_CACHE: KVNamespace
	userKEK: string
	QUEUE: Queue<MessageBody>

	CF_ACCOUNT_ID: string
	CF_API_TOKEN: string

	// Configuration for Cloudflare Access
	DOMAIN: string
	ACCESS_AUD: string
	ACCESS_AUTH_DOMAIN: string

	// Configuration for the instance
	INSTANCE_TITLE: string
	ADMIN_EMAIL: string
	INSTANCE_DESCR: string
	VAPID_JWK: string

	SENTRY_DSN: string
	SENTRY_ACCESS_CLIENT_ID: string
	SENTRY_ACCESS_CLIENT_SECRET: string
}
