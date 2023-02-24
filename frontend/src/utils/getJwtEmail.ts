import * as access from 'wildebeest/backend/src/access'

export function getJwtEmail(jwtCookie: string) {
	let payload: access.JWTPayload
	if (!jwtCookie) {
		throw new Error('Missing Authorization')
	}
	try {
		// TODO: eventually, verify the JWT with Access, however this
		// is not critical.
		payload = access.getPayload(jwtCookie)
	} catch (e: unknown) {
		const error = e as { stack: string; cause: string }
		console.warn(error.stack, error.cause)
		throw new Error('Failed to validate Access JWT')
	}

	if (!payload.email) {
		throw new Error("The Access JWT doesn't contain an email")
	}

	return payload.email
}
