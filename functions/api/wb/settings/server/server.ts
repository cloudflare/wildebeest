import type { Env } from 'wildebeest/backend/src/types/env'
import type { ContextData } from 'wildebeest/backend/src/types/context'
import * as errors from 'wildebeest/backend/src/errors'
import { type Database, getDatabase } from 'wildebeest/backend/src/database'
import { parse } from 'cookie'
import { ServerSettingsData } from 'wildebeest/frontend/src/routes/(admin)/settings/(admin)/server-settings/layout'
import { isUserAdmin } from 'wildebeest/backend/src/utils/auth/isUserAdmin'

export const onRequestGet: PagesFunction<Env, any, ContextData> = async ({ env, request }) => {
	return handleRequestPost(await getDatabase(env), request, env.ACCESS_AUTH_DOMAIN, env.ACCESS_AUD)
}

export async function handleRequestGet(db: Database) {
	const query = `SELECT * from server_settings`
	const result = await db.prepare(query).all<{ setting_name: string; setting_value: string }>()

	// prettier-ignore
	const data = (result.results ?? []).reduce(
		(settings, { setting_name, setting_value }) => ({
			[setting_name]: setting_value,
			...settings
		}),
		{} as Object
	)

	if (!result.success) {
		return new Response('SQL error: ' + result.error, { status: 500 })
	}

	return new Response(JSON.stringify(data), { status: 200 })
}

export const onRequestPost: PagesFunction<Env, any, ContextData> = async ({ env, request }) => {
	return handleRequestPost(await getDatabase(env), request, env.ACCESS_AUTH_DOMAIN, env.ACCESS_AUD)
}

export async function handleRequestPost(db: Database, request: Request, accessAuthDomain: string, accessAud: string) {
	const cookie = parse(request.headers.get('Cookie') || '')
	const jwt = cookie['CF_Authorization']
	const isAdmin = await isUserAdmin(request, jwt, accessAuthDomain, accessAud, db)

	if (!isAdmin) {
		return errors.notAuthorized('Lacking authorization rights to edit server settings')
	}

	const data = await request.json<ServerSettingsData>()

	const result = await upsertServerSettings(db, data)

	if (result && !result.success) {
		return new Response('SQL error: ' + result.error, { status: 500 })
	}

	return new Response('', { status: 200 })
}

export async function upsertServerSettings(db: Database, settings: Partial<ServerSettingsData>) {
	const settingsEntries = Object.entries(settings)

	if (!settingsEntries.length) {
		return null
	}

	const query = `
		INSERT INTO server_settings (setting_name, setting_value)
		VALUES ${settingsEntries.map(() => `(?, ?)`).join(', ')}
		ON CONFLICT(setting_name) DO UPDATE SET setting_value=excluded.setting_value
	`

	return await db
		.prepare(query)
		.bind(...settingsEntries.flat())
		.run()
}
