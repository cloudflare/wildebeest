import { cors } from 'wildebeest/backend/src/utils/cors'

type ErrorResponse = {
	error: string
	error_description?: string
}

const headers = {
	...cors(),
	'content-type': 'application/json; charset=utf-8',
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

export function methodNotAllowed(): Response {
	return generateErrorResponse(`Method not allowed`, 405)
}

export function unprocessableEntity(detail: string): Response {
	return generateErrorResponse(`Unprocessable entity`, 422, detail)
}

export function internalServerError(): Response {
	return generateErrorResponse('Internal Server Error', 500)
}

export function statusNotFound(id: string): Response {
	return resourceNotFound('status', id)
}

export function mediaNotFound(id: string): Response {
	return resourceNotFound('media', id)
}

export function tagNotFound(tag: string): Response {
	return resourceNotFound('tag', tag)
}

export function exceededLimit(detail: string): Response {
	return generateErrorResponse('Limit exceeded', 400, detail)
}

export function resourceNotFound(name: string, id: string): Response {
	return generateErrorResponse('Resource not found', 404, `${name} "${id}" not found`)
}

export function validationError(detail: string): Response {
	return generateErrorResponse('Validation failed', 422, detail)
}
