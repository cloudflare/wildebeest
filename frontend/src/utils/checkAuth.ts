import * as access from 'wildebeest/backend/src/access'

type Env = {
	ACCESS_AUTH_DOMAIN: string
	ACCESS_AUD: string
}

export const checkAuth = async (request: Request, platform: Env) => {
	const jwt = request.headers.get('Cf-Access-Jwt-Assertion') || ''
	if (!jwt) return false

	try {
		const validate = access.generateValidator({
			jwt,
			domain: platform.ACCESS_AUTH_DOMAIN,
			aud: platform.ACCESS_AUD,
		})
		await validate(new Request(request.url))
	} catch {
		return false
	}

	const identity = await access.getIdentity({ jwt, domain: platform.ACCESS_AUTH_DOMAIN })
	if (identity) {
		return true
	}
	return false
}
