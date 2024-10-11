// Prepared statements for Mastodon Instance API endpoints
/** Returns a SQL statement that can be used to calculate the instance-level
 * statistics required by the Mastodon `GET /api/v1/instance` endpoint. The
 * string returned by this method should be passed as a prepared statement
 * to a `Database` object that references a Wildebeest database instance in order
 * to retrieve actual results. For example:
 *
 *
 * ```
 *  const sqlQuery: string = sqlMastoV1InstanceStats('example.com')
 *  const row: any = await db.prepare(sqlQuery).first<{ user_count: number, status_count: number, domain_count: number }>()
 *
 *
 * ```
 *
 * @param domain expects an HTTP origin or hostname
 * @return a string value representing a SQL statement that can be used to
 * calculate instance-level aggregate statistics
 */
export const sqlMastoV1InstanceStats = (domain: string): string => {
	return `
  SELECT
    (SELECT count(1) FROM actors WHERE type IN ('Person', 'Service') AND id LIKE '%${domain}/ap/users/%') AS user_count,
    (SELECT count(1) FROM objects WHERE local = 1 AND type = 'Note') AS status_count,
    (SELECT count(1) FROM peers) + 1 AS domain_count
  ;
`
}
