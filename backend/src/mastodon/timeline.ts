import type { MastodonStatus } from 'wildebeest/backend/src/types/status'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors/'
import { toMastodonStatusFromRow } from './status'
import { PUBLIC_GROUP } from 'wildebeest/backend/src/activitypub/activities'
import type { Cache } from 'wildebeest/backend/src/cache'
import { type Database } from 'wildebeest/backend/src/database'

export async function pregenerateTimelines(domain: string, db: Database, cache: Cache, actor: Actor) {
	const timeline = await getHomeTimeline(domain, db, actor)
	await cache.put(actor.id + '/timeline/home', timeline)
}

export async function getHomeTimeline(domain: string, db: Database, actor: Actor): Promise<Array<MastodonStatus>> {
	const { results: following } = await db
		.prepare(
			`
            SELECT
                actor_following.target_actor_id as id,
                ${db.qb.jsonExtract('actors.properties', 'followers')} as actorFollowersURL
            FROM actor_following
            INNER JOIN actors ON actors.id = actor_following.target_actor_id
            WHERE actor_id=? AND state='accepted'
        `
		)
		.bind(actor.id.toString())
		.all<{ id: string; actorFollowersURL: string | null }>()

	let followingIds: string[] = []
	let followingFollowersURLs: string[] = []

	if (following) {
		followingIds = following.map((row) => row.id)
		followingFollowersURLs = following.map((row) => {
			if (row.actorFollowersURL) {
				return row.actorFollowersURL
			} else {
				// We don't have the Actor's followers URL stored, we'll guess
				// one.
				return row.id + '/followers'
			}
		})
	}

	// follow ourself to see our statuses in the our home timeline
	followingIds.push(actor.id.toString())

	const QUERY = `
SELECT objects.*,
       actors.id as actor_id,
       actors.cdate as actor_cdate,
       actors.properties as actor_properties,
       outbox_objects.actor_id as publisher_actor_id,
       (SELECT count(*) FROM actor_favourites WHERE actor_favourites.object_id=objects.id) as favourites_count,
       (SELECT count(*) FROM actor_reblogs WHERE actor_reblogs.object_id=objects.id) as reblogs_count,
       (SELECT count(*) FROM actor_replies WHERE actor_replies.in_reply_to_object_id=objects.id) as replies_count,
       (SELECT count(*) > 0 FROM actor_reblogs WHERE actor_reblogs.object_id=objects.id AND actor_reblogs.actor_id=?1) as reblogged,
       (SELECT count(*) > 0 FROM actor_favourites WHERE actor_favourites.object_id=objects.id AND actor_favourites.actor_id=?1) as favourited
FROM outbox_objects
INNER JOIN objects ON objects.id = outbox_objects.object_id
INNER JOIN actors ON actors.id = outbox_objects.actor_id
WHERE
     objects.type = 'Note'
     AND outbox_objects.actor_id IN ${db.qb.set('?2')}
     AND ${db.qb.jsonExtractIsNull('objects.properties', 'inReplyTo')}
     AND (outbox_objects.target = '${PUBLIC_GROUP}' OR outbox_objects.target IN ${db.qb.set('?3')})
GROUP BY objects.id ${db.qb.psqlOnly(', actors.id, outbox_objects.actor_id, outbox_objects.published_date')}
ORDER by outbox_objects.published_date DESC
LIMIT ?4
`
	const DEFAULT_LIMIT = 20

	const { success, error, results } = await db
		.prepare(QUERY)
		.bind(actor.id.toString(), JSON.stringify(followingIds), JSON.stringify(followingFollowersURLs), DEFAULT_LIMIT)
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
			return 'true'
		case LocalPreference.OnlyLocal:
			return 'objects.local = 1'
		case LocalPreference.OnlyRemote:
			return 'objects.local = 0'
	}
}

export async function getPublicTimeline(
	domain: string,
	db: Database,
	localPreference: LocalPreference,
	offset: number = 0,
	hashtag?: string
): Promise<Array<MastodonStatus>> {
	let hashtagFilter = ''
	if (hashtag) {
		hashtagFilter = 'AND note_hashtags.value=?3'
	}

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
LEFT JOIN note_hashtags ON objects.id=note_hashtags.object_id
WHERE objects.type='Note'
      AND ${localPreferenceQuery(localPreference)}
      AND ${db.qb.jsonExtractIsNull('objects.properties', 'inReplyTo')}
      AND outbox_objects.target = '${PUBLIC_GROUP}'
      ${hashtagFilter}
GROUP BY objects.id ${db.qb.psqlOnly(
		', actors.id, actors.cdate, actors.properties, outbox_objects.actor_id, outbox_objects.published_date'
	)}
ORDER by outbox_objects.published_date DESC
LIMIT ?1 OFFSET ?2
`
	const DEFAULT_LIMIT = 20

	let query = db.prepare(QUERY).bind(DEFAULT_LIMIT, offset)
	if (hashtagFilter) {
		query = db.prepare(QUERY).bind(DEFAULT_LIMIT, offset, hashtag)
	}

	const { success, error, results } = await query.all()
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
