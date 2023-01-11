import type { Env } from 'wildebeest/backend/src/types/env'
import type { JWK } from 'wildebeest/backend/src/webpush/jwk'

export const DEFAULT_THUMBNAIL =
	'https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/b24caf12-5230-48c4-0bf7-2f40063bd400/thumbnail'

export function getVAPIDKeys(env: Env): JWK {
	const value: JWK = JSON.parse(env.VAPID_JWK)
	return value
}
