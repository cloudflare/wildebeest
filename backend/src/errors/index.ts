type ErrorResponse = {
	error: string
	error_description?: string
}

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'content-type, authorization',
	'content-type': 'application/json',
} as const

function generateErrorResponse(error: string, status: number, errorDescription?: string): Response {
	const res: ErrorResponse = {
		error: `${error}. ` + 'If the problem persists please contact your instance administrator.',
		...(errorDescription ? { error_description: errorDescription } : {}),
	}
	return new Response(JSON.stringify(res), { headers, status })
}

export function notAuthorized(error: string, descr?: string): Response {
	return generateErrorResponse(`An error occurred (${error})`, 401, descr)
}

export function domainNotAuthorized(): Response {
	return generateErrorResponse(`Domain is not authorizated`, 403)
}

export function userConflict(): Response {
	return generateErrorResponse(`User already exists or conflicts`, 403)
}

export function timelineMissing(): Response {
	return generateErrorResponse(`The timeline is invalid or being regenerated`, 404)
}

export function clientUnknown(): Response {
	return generateErrorResponse(`The client is unknown or invalid`, 403)
}
