import { Toucan } from 'toucan-js'
import type { Env } from 'wildebeest/backend/src/types/env'

export function initSentry(request: Request, env: Env, context: any) {
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
		request,
		transportOptions: { headers },
	})
	const cf = (request as { cf?: IncomingRequestCfProperties }).cf
	const colo = cf?.colo ? cf.colo : 'UNKNOWN'
	sentry.setTag('colo', colo)

	// cf-connecting-ip should always be present, but if not we can fallback to XFF.
	const ipAddress = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')
	const userAgent = request.headers.get('user-agent') || ''
	sentry.setUser({ ip: ipAddress, userAgent: userAgent, colo: colo })
	return sentry
}
