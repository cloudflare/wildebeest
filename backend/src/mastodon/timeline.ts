import type { MastodonStatus } from 'wildebeest/backend/src/types/status'
import { getFollowingId } from 'wildebeest/backend/src/mastodon/follow'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors/'
import { toMastodonStatusFromRow } from './status'
import { emailSymbol } from 'wildebeest/backend/src/activitypub/actors/'

export async function pregenerateTimelines(domain: string, db: D1Database, cache: KVNamespace, actor: Actor) {
	{
		const timeline = await getHomeTimeline(domain, db, actor)
		await cache.put(actor.id + '/timeline/home', JSON.stringify(timeline))
	}
}

export async function getHomeTimeline(domain: string, db: D1Database, actor: Actor): Promise<Array<MastodonStatus>> {
	const following = await getFollowingId(db, actor)
	// follow ourself to see our statuses in the our home timeline
	following.push(actor.id.toString())

	const QUERY = `
SELECT objects.*,
       actors.id as actor_id,
       actors.cdate as actor_cdate,
       actors.properties as actor_properties,
       outbox_objects.actor_id as publisher_actor_id,
       (SELECT count(*) FROM actor_favourites WHERE actor_favourites.object_id=objects.id) as favourites_count,
       (SELECT count(*) FROM actor_reblogs WHERE actor_reblogs.object_id=objects.id) as reblogs_count,
       (SELECT count(*) FROM actor_replies WHERE actor_replies.in_reply_to_object_id=objects.id) as replies_count,
       (SELECT count(*) > 0 FROM actor_reblogs WHERE actor_reblogs.object_id=objects.id AND actor_reblogs.actor_id=?) as reblogged,
       (SELECT count(*) > 0 FROM actor_favourites WHERE actor_favourites.object_id=objects.id AND actor_favourites.actor_id=?) as favourited
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
INNER JOIN actors ON actors.id = outbox_objects.actor_id
WHERE
     objects.type = 'Note'
     AND outbox_objects.actor_id IN (SELECT value FROM json_each(?))
     AND json_extract(objects.properties, '$.inReplyTo') IS NULL
ORDER by outbox_objects.published_date DESC
LIMIT ?
`
	const DEFAULT_LIMIT = 20

	const { success, error, results } = await db
		.prepare(QUERY)
		.bind(actor.id.toString(), actor.id.toString(), JSON.stringify(following), DEFAULT_LIMIT)
		.all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
	if (!results) {
		return []
	}

	const out: Array<MastodonStatus> = []

	for (let i = 0, len = results.length; i < len; i++) {
		const status = await toMastodonStatusFromRow(domain, db, results[i])
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
			return '1'
		case LocalPreference.OnlyLocal:
			return 'objects.local = 1'
		case LocalPreference.OnlyRemote:
			return 'objects.local = 0'
	}
}

export async function getPublicTimeline(
	domain: string,
	db: D1Database,
	localPreference: LocalPreference,
	offset: number = 0
): Promise<Array<MastodonStatus>> {
	const QUERY = `
SELECT objects.*,
       actors.id as actor_id,
       actors.cdate as actor_cdate,
       actors.properties as actor_properties,
       outbox_objects.actor_id as publisher_actor_id,
       (SELECT count(*) FROM actor_favourites WHERE actor_favourites.object_id=objects.id) as favourites_count,
       (SELECT count(*) FROM actor_reblogs WHERE actor_reblogs.object_id=objects.id) as reblogs_count,
       (SELECT count(*) FROM actor_replies WHERE actor_replies.in_reply_to_object_id=objects.id) as replies_count
FROM outbox_objects
INNER JOIN objects ON objects.id=outbox_objects.object_id
INNER JOIN actors ON actors.id=outbox_objects.actor_id
WHERE objects.type='Note'
      AND ${localPreferenceQuery(localPreference)}
      AND json_extract(objects.properties, '$.inReplyTo') IS NULL
ORDER by outbox_objects.published_date DESC
LIMIT ?1 OFFSET ?2
`
	const DEFAULT_LIMIT = 20

	const { success, error, results } = await db.prepare(QUERY).bind(DEFAULT_LIMIT, offset).all()
	if (!success) {
		throw new Error('SQL error: ' + error)
	}
	if (!results) {
		return []
	}

	const out: Array<MastodonStatus> = []

	for (let i = 0, len = results.length; i < len; i++) {
		const status = await toMastodonStatusFromRow(domain, db, results[i])
		if (status !== null) {
			out.push(status)
		}
	}

	return out
}
