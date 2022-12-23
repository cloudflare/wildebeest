import type { MastodonStatus } from 'wildebeest/backend/src/types/status'
import { getFollowingId } from 'wildebeest/backend/src/mastodon/follow'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors/'
import { toMastodonStatusFromRow } from './status'

export async function getHomeTimeline(db: D1Database, actor: Actor): Promise<Array<MastodonStatus>> {
	const following = await getFollowingId(db, actor)
	// follow ourself to see our statuses in the our home timeline
	following.push(actor.id)

	const QUERY = `
SELECT objects.*,
       actors.id as actor_id,
       actors.cdate as actor_cdate,
       actors.properties as actor_properties,
       outbox_objects.actor_id as publisher_actor_id,
       (SELECT count(*) FROM actor_favourites WHERE actor_favourites.object_id=objects.id) as favourites_count,
       (SELECT count(*) FROM actor_reblogs WHERE actor_reblogs.object_id=objects.id) as reblogs_count
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
INNER JOIN actors ON actors.id = outbox_objects.actor_id
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

export enum LocalPreference {
	NotSet,
	OnlyLocal,
	OnlyRemote,
}

function localPreferenceQuery(preference: LocalPreference): string {
	switch (preference) {
		case LocalPreference.NotSet:
			return ''
		case LocalPreference.OnlyLocal:
			return 'AND objects.local = 1'
		case LocalPreference.OnlyRemote:
			return 'AND objects.local = 0'
	}
}

export async function getPublicTimeline(
	db: D1Database,
	localPreference: LocalPreference
): Promise<Array<MastodonStatus>> {
	const QUERY = `
SELECT objects.*,
       actors.id as actor_id,
       actors.cdate as actor_cdate,
       actors.properties as actor_properties,
       outbox_objects.actor_id as publisher_actor_id,
       (SELECT count(*) FROM actor_favourites WHERE actor_favourites.object_id=objects.id) as favourites_count,
       (SELECT count(*) FROM actor_reblogs WHERE actor_reblogs.object_id=objects.id) as reblogs_count
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
INNER JOIN actors ON actors.id = outbox_objects.actor_id
WHERE objects.type = 'Note'
${localPreferenceQuery(localPreference)}
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
