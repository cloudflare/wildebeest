import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import * as actors from 'wildebeest/backend/src/activitypub/actors'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'
import { getResultsField } from './utils'
import { type Database } from 'wildebeest/backend/src/database'

const STATE_PENDING = 'pending'
const STATE_ACCEPTED = 'accepted'

// During a migration we move the followers from the old Actor to the new
export async function moveFollowers(db: Database, actor: Actor, followers: Array<string>): Promise<void> {
	const batch = []
	const stmt = db.prepare(
		db.qb.insertOrIgnore(`
        INTO actor_following (id, actor_id, target_actor_id, target_actor_acct, state)
		VALUES (?1, ?2, ?3, ?4, 'accepted')
    `)
	)

	const actorId = actor.id.toString()
	const actorAcc = urlToHandle(actor.id)

	for (let i = 0; i < followers.length; i++) {
		const follower = new URL(followers[i])
		const followActor = await actors.getAndCache(follower, db)

		const id = crypto.randomUUID()
		batch.push(stmt.bind(id, followActor.id.toString(), actorId, actorAcc))
	}

	await db.batch(batch)
}

export async function moveFollowing(db: Database, actor: Actor, followingActors: Array<string>): Promise<void> {
	const batch = []
	const stmt = db.prepare(
		db.qb.insertOrIgnore(`
        INTO actor_following (id, actor_id, target_actor_id, target_actor_acct, state)
		VALUES (?1, ?2, ?3, ?4, 'accepted')
    `)
	)

	const actorId = actor.id.toString()

	for (let i = 0; i < followingActors.length; i++) {
		const following = new URL(followingActors[i])
		const followingActor = await actors.getAndCache(following, db)
		const actorAcc = urlToHandle(followingActor.id)

		const id = crypto.randomUUID()
		batch.push(stmt.bind(id, actorId, followingActor.id.toString(), actorAcc))
	}

	await db.batch(batch)
}

// Add a pending following
export async function addFollowing(db: Database, actor: Actor, target: Actor, targetAcct: string): Promise<string> {
	const id = crypto.randomUUID()

	const query = db.qb.insertOrIgnore(`
		INTO actor_following (id, actor_id, target_actor_id, state, target_actor_acct)
		VALUES (?, ?, ?, ?, ?)
	`)

	const out = await db
		.prepare(query)
		.bind(id, actor.id.toString(), target.id.toString(), STATE_PENDING, targetAcct)
		.run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
	return id
}

// Accept the pending following request
export async function acceptFollowing(db: Database, actor: Actor, target: Actor) {
	const query = `
		UPDATE actor_following SET state=? WHERE actor_id=? AND target_actor_id=? AND state=?
	`

	const out = await db
		.prepare(query)
		.bind(STATE_ACCEPTED, actor.id.toString(), target.id.toString(), STATE_PENDING)
		.run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}

export async function removeFollowing(db: Database, actor: Actor, target: Actor) {
	const query = `
		DELETE FROM actor_following WHERE actor_id=? AND target_actor_id=?
	`

	const out = await db.prepare(query).bind(actor.id.toString(), target.id.toString()).run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}

export function getFollowingAcct(db: Database, actor: Actor): Promise<Array<string>> {
	const query = `
		SELECT target_actor_acct FROM actor_following WHERE actor_id=? AND state=?
	`
	const statement = db.prepare(query).bind(actor.id.toString(), STATE_ACCEPTED)

	return getResultsField(statement, 'target_actor_acct')
}

export function getFollowingRequestedAcct(db: Database, actor: Actor): Promise<Array<string>> {
	const query = `
		SELECT target_actor_acct FROM actor_following WHERE actor_id=? AND state=?
	`

	const statement = db.prepare(query).bind(actor.id.toString(), STATE_PENDING)

	return getResultsField(statement, 'target_actor_acct')
}

export function getFollowingId(db: Database, actor: Actor): Promise<Array<string>> {
	const query = `
		SELECT target_actor_id FROM actor_following WHERE actor_id=? AND state=?
	`

	const statement = db.prepare(query).bind(actor.id.toString(), STATE_ACCEPTED)

	return getResultsField(statement, 'target_actor_id')
}

export function getFollowers(db: Database, actor: Actor): Promise<Array<string>> {
	const query = `
		SELECT actor_id FROM actor_following WHERE target_actor_id=? AND state=?
	`

	const statement = db.prepare(query).bind(actor.id.toString(), STATE_ACCEPTED)

	return getResultsField(statement, 'actor_id')
}
