import { instanceConfig } from '../config/instance'

type ErrorResponse = {
    error: string
    error_description?: string
}

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'content-type': 'application/json',
}

export function notAuthorized(error: string, descr?: string): Response {
    const res: ErrorResponse = {
        error: `An error occurred (${error}). If the problem persists please contact your instance administrator: ${instanceConfig.email}.`,
    }
    if (descr !== undefined) {
        res.error_description = descr
    }
    return new Response(JSON.stringify(res), { headers, status: 401 })
}
