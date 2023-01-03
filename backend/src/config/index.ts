export type InstanceConfig = {
	title?: string
	email?: string
	description?: string
	accessAud?: string
	accessDomain?: string
}

export async function configure(db: D1Database, data: InstanceConfig) {
	const sql = `
        INSERT INTO instance_config
        VALUES ('title', ?),
               ('email', ?),
               ('description', ?);
    `

	const { success, error } = await db.prepare(sql).bind(data.title, data.email, data.description).run()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
}

export async function configureAccess(db: D1Database, domain: string, aud: string) {
	const sql = `
        INSERT INTO instance_config
        VALUES ('accessAud', ?), ('accessDomain', ?);
    `

	const { success, error } = await db.prepare(sql).bind(aud, domain).run()
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
