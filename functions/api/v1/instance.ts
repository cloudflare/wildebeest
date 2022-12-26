import { instanceConfig } from 'wildebeest/config/instance'

const INSTANCE_VERSION = '4.0.2'

export const onRequest = () => {
	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'content-type, authorization',
		'content-type': 'application/json; charset=utf-8',
		'cache-control': 'max-age=180, public',
	}

	const res = {
		...instanceConfig,
		// Registration is disabled because unsupported by Wildebeest. Users
		// should go through the login flow and authenticate with Access.
		// The documentation is incorrect and registrations is a boolean.
		registrations: false,
		version: INSTANCE_VERSION,
	}

	if (res.short_description === undefined) {
		res.short_description = instanceConfig.description
	}

	return new Response(JSON.stringify(res), { headers })
}
