export type InstanceConfig = {
	title?: string
	email?: string
	description?: string
	thumbnail?: string
}

const DEFAULT_THUMBNAIL =
	'https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/b24caf12-5230-48c4-0bf7-2f40063bd400/thumbnail'

export async function configure(db: D1Database, data: InstanceConfig) {
	const sql = `
        INSERT INTO instance_config
        VALUES ('title', ?),
               ('email', ?),
               ('thumbnail', ?),
               ('description', ?);
    `

	const { success, error } = await db
		.prepare(sql)
		.bind(data.title, data.email, DEFAULT_THUMBNAIL, data.description)
		.run()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
}

export async function generateVAPIDKeys(db: D1Database) {
	const keyPair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
		'sign',
		'verify',
	])) as CryptoKeyPair
	const jwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)

	const sql = `
        INSERT INTO instance_config
        VALUES ('vapid_jwk', ?);
    `

	const { success, error } = await db.prepare(sql).bind(JSON.stringify(jwk)).run()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
}

export async function get(db: D1Database, name: string): Promise<string> {
	const row: { value: string } = await db.prepare('SELECT value FROM instance_config WHERE key = ?').bind(name).first()
	if (!row) {
		throw new Error(`configuration not found: ${name}`)
	}
	return row.value
}
