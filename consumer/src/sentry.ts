import { Toucan } from 'toucan-js'
import type { Env } from './'

export function initSentryQueue(env: Env, context: any) {
	if (env.SENTRY_DSN === '') {
		return null
	}

	const headers: any = {}

	if (env.SENTRY_ACCESS_CLIENT_ID !== '' && env.SENTRY_ACCESS_CLIENT_SECRET !== '') {
		headers['CF-Access-Client-ID'] = env.SENTRY_ACCESS_CLIENT_ID
		headers['CF-Access-Client-Secret'] = env.SENTRY_ACCESS_CLIENT_SECRET
	}

	const sentry = new Toucan({
		dsn: env.SENTRY_DSN,
		context,
		transportOptions: { headers },
	})

	return sentry
}
