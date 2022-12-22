import type { MastodonStatus } from 'wildebeest/backend/src/types/status'
import { getFollowingId } from 'wildebeest/backend/src/mastodon/follow'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors/'
import { toMastodonStatusFromRow } from './status'

export async function getHomeTimeline(db: D1Database, actor: Actor): Promise<Array<MastodonStatus>> {
	const following = await getFollowingId(db, actor)
	if (following.length === 0) {
		return []
	}

	const QUERY = `
SELECT objects.*, outbox_objects.actor_id as publisher_actor_id
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
WHERE objects.type = 'Note' AND outbox_objects.actor_id IN (SELECT value FROM json_each(?))
ORDER by outbox_objects.cdate DESC
LIMIT ?
`
	const DEFAULT_LIMIT = 20

	const { success, error, results } = await db.prepare(QUERY).bind(JSON.stringify(following), DEFAULT_LIMIT).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
	if (!results) {
		return []
	}

	const out: Array<MastodonStatus> = []

	for (let i = 0, len = results.length; i < len; i++) {
		const status = await toMastodonStatusFromRow(db, results[i])
		if (status !== null) {
			out.push(status)
		}
	}

	return out
}

export async function getPublicTimeline(db: D1Database): Promise<Array<MastodonStatus>> {
	const QUERY = `
SELECT objects.*, outbox_objects.actor_id as publisher_actor_id
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
WHERE objects.type = 'Note'
ORDER by outbox_objects.cdate DESC
LIMIT ?
`
	const DEFAULT_LIMIT = 20

	const { success, error, results } = await db.prepare(QUERY).bind(DEFAULT_LIMIT).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
	if (!results) {
		return []
	}

	const out: Array<MastodonStatus> = []

	for (let i = 0, len = results.length; i < len; i++) {
		const status = await toMastodonStatusFromRow(db, results[i])
		if (status !== null) {
			out.push(status)
		}
	}

	return out
}
