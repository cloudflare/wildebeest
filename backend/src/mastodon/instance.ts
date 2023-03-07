import type { InstanceStatistics } from 'wildebeest/backend/src/types/instance'
import { sqlMastoV1InstanceStats } from 'wildebeest/backend/src/mastodon/sql/instance'
import { Database } from 'wildebeest/backend/src/database'

export async function calculateInstanceStatistics(origin: string, db: Database): Promise<InstanceStatistics> {
	const row: any = await db
		.prepare(sqlMastoV1InstanceStats(origin))
		.first<{ user_count: number; status_count: number; domain_count: number }>()

	return {
		user_count: row?.user_count ?? 0,
		status_count: row?.status_count ?? 0,
		domain_count: row?.domain_count ?? 1,
	} as InstanceStatistics
}
