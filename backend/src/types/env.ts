export interface Env {
	DATABASE: D1Database
	KV_CACHE: KVNamespace
	userKEK: string

	CF_ACCOUNT_ID: string
	CF_API_TOKEN: string

	// Configuration for Cloudflare Access
	DOMAIN: string
	ACCESS_AUD: string
	ACCESS_AUTH_DOMAIN: string
}
