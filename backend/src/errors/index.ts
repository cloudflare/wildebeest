import { cors } from 'wildebeest/backend/src/utils/cors'

type ErrorResponse = {
	error: string
	error_description?: string
}

const headers = {
	...cors(),
	'content-type': 'application/json',
} as const

function generateErrorResponse(error: string, status: number, errorDescription?: string): Response {
	const res: ErrorResponse = {
		error: `${error}. If the problem persists please contact your instance administrator.`,
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

export function clientUnknown(): Response {
	return generateErrorResponse(`The client is unknown or invalid`, 403)
}

export function internalServerError(): Response {
	return generateErrorResponse('Internal Server Error', 500)
}

export function statusNotFound(id: string): Response {
	return generateErrorResponse('Resource not found', 404, `Status "${id}" not found`)
}

export function mediaNotFound(id: string): Response {
	return generateErrorResponse('Resource not found', 404, `Media "${id}" not found`)
}

export function tagNotFound(tag: string): Response {
	return generateErrorResponse('Resource not found', 404, `Tag "${tag}" not found`)
}

export function exceededLimit(detail: string): Response {
	return generateErrorResponse('Limit exceeded', 400, detail)
}
