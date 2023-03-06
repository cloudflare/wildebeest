import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import * as errors from 'wildebeest/backend/src/errors'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { isUserAdmin } from 'wildebeest/frontend/src/utils/isUserAdmin'
import { parse } from 'cookie'

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ env, request }) => {
	return handleRequestPost(await getDatabase(env), request, env.ACCESS_AUTH_DOMAIN, env.ACCESS_AUD)
}

export async function handleRequestGet(db: Database) {
	const query = `SELECT * from server_rules;`
	const result = await db.prepare(query).all<{ id: string; text: string }>()

	if (!result.success) {
		return new Response('SQL error: ' + result.error, { status: 500 })
	}

	return new Response(JSON.stringify(result.results ?? []), { status: 200 })
}

export const onRequestPost: PagesFunction<Env, any, ContextData> = async ({ env, request }) => {
	return handleRequestPost(await getDatabase(env), request, env.ACCESS_AUTH_DOMAIN, env.ACCESS_AUD)
}

export async function handleRequestPost(db: Database, request: Request, accessAuthDomain: string, accessAud: string) {
	const cookie = parse(request.headers.get('Cookie') || '')
	const jwt = cookie['CF_Authorization']
	const isAdmin = await isUserAdmin(request, jwt, accessAuthDomain, accessAud, db)

	if (!isAdmin) {
		return errors.notAuthorized('Lacking authorization rights to edit server rules')
	}

	const rule = await request.json<{ id?: number; text: string }>()
	const result = await upsertRule(db, rule)

	if (!result.success) {
		return new Response('SQL error: ' + result.error, { status: 500 })
	}

	return new Response('', { status: 200 })
}

export async function upsertRule(db: Database, rule: { id?: number; text: string } | string) {
	const id = typeof rule === 'string' ? null : rule.id ?? null
	const text = typeof rule === 'string' ? rule : rule.text
	return await db
		.prepare(
			`INSERT INTO server_rules (id, text)
		VALUES (?, ?)
		ON CONFLICT(id) DO UPDATE SET text=excluded.text;`
		)
		.bind(id, text)
		.run()
}

export async function handleRequestDelete(db: Database, request: Request, accessAuthDomain: string, accessAud: string) {
	const cookie = parse(request.headers.get('Cookie') || '')
	const jwt = cookie['CF_Authorization']
	const isAdmin = await isUserAdmin(request, jwt, accessAuthDomain, accessAud, db)

	if (!isAdmin) {
		return errors.notAuthorized('Lacking authorization rights to edit server rules')
	}

	const rule = await request.json<{ id: number }>()
	const result = await deleteRule(db, rule.id)

	if (!result.success) {
		return new Response('SQL error: ' + result.error, { status: 500 })
	}

	return new Response('', { status: 200 })
}

export async function deleteRule(db: Database, ruleId: number) {
	return await db.prepare('DELETE FROM server_rules WHERE id=?').bind(ruleId).run()
}
