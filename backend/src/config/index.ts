export type InstanceConfig = {
	title: string
	uri: string
	email: string
	description: string
}

export async function configure(db: D1Database, data: InstanceConfig) {
	const sql = `
        INSERT INTO instance_config
        VALUES ('uri', ?),
               ('title', ?),
               ('email', ?),
               ('description', ?);
    `

	const { success, error } = await db.prepare(sql).bind(data.uri, data.title, data.email, data.description).run()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
}

export async function get(db: D1Database, key: string): Promise<string> {
	const sql = `
        SELECT value FROM instance_config WHERE key=?
    `
	const res: any = await db.prepare(sql).bind(key).first()
	return res.value
}
