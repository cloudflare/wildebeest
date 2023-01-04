export async function getResultsField(statement: D1PreparedStatement, fieldName: string): Promise<Array<string>> {
	const out: D1Result<Record<string, string>> = await statement.all()

	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}

	return (out.results ?? []).map((x) => x[fieldName])
}
