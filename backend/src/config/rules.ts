import { type Database } from 'wildebeest/backend/src/database'

export async function getRules(db: Database): Promise<Array<{ id: string; text: string }>> {
	const query = `SELECT * from server_rules;`
	const result = await db.prepare(query).all<{ id: string; text: string }>()

	if (!result.success) {
		throw new Error('SQL error: ' + result.error)
	}

	return result.results ?? []
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

export async function deleteRule(db: Database, ruleId: number) {
	return await db.prepare('DELETE FROM server_rules WHERE id=?').bind(ruleId).run()
}
