import * as access from 'wildebeest/backend/src/access'

export async function isUserAuthenticated(request: Request, jwt: string, accessAuthDomain: string, accessAud: string) {
	if (!jwt) return false

	try {
		const validate = access.generateValidator({
			jwt,
			domain: accessAuthDomain,
			aud: accessAud,
		})
		await validate(new Request(request.url))
	} catch {
		return false
	}

	const identity = await access.getIdentity({ jwt, domain: accessAuthDomain })
	if (identity) {
		return true
	}
	return false
}
