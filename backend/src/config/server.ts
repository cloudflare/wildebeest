import { type Database } from 'wildebeest/backend/src/database'
import { type ServerSettingsData } from 'wildebeest/frontend/src/routes/(admin)/settings/(admin)/server-settings/layout'

export async function getSettings(db: Database): Promise<ServerSettingsData> {
	const query = `SELECT * from server_settings`
	const result = await db.prepare(query).all<{ setting_name: string; setting_value: string }>()

	const data = (result.results ?? []).reduce(
		(settings, { setting_name, setting_value }) => ({
			...settings,
			[setting_name]: setting_value,
		}),
		{} as Object
	)

	if (!result.success) {
		throw new Error('SQL Error: ' + result.error)
	}

	return data as ServerSettingsData
}

export async function updateSettings(db: Database, data: Partial<ServerSettingsData>) {
	const result = await upsertServerSettings(db, data)
	if (result && !result.success) {
		throw new Error('SQL Error: ' + result.error)
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
