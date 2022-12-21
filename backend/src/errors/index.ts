import { instanceConfig } from 'wildebeest/config/instance'

type ErrorResponse = {
	error: string
	error_description?: string
}

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type, authorization',
	'content-type': 'application/json',
}

const HELP = `If the problem persists please contact your instance administrator: ${instanceConfig.email}.`

export function notAuthorized(error: string, descr?: string): Response {
	const res: ErrorResponse = {
		error: `An error occurred (${error}). ${HELP}`,
	}
	if (descr !== undefined) {
		res.error_description = descr
	}
	return new Response(JSON.stringify(res), { headers, status: 401 })
}

export function domainNotAuthorized(): Response {
	const res: ErrorResponse = {
		error: `Domain is not authorizated. ${HELP}`,
	}
	return new Response(JSON.stringify(res), { headers, status: 403 })
}
