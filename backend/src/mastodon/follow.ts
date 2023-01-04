import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { getResultsField } from './utils'

const STATE_PENDING = 'pending'
const STATE_ACCEPTED = 'accepted'

// Add a pending following
export async function addFollowing(db: D1Database, actor: Actor, target: Actor, targetAcct: string): Promise<string> {
	const id = crypto.randomUUID()

	const query = `
		INSERT INTO actor_following (id, actor_id, target_actor_id, state, target_actor_acct)
		VALUES (?, ?, ?, ?, ?)
	`

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
export async function acceptFollowing(db: D1Database, actor: Actor, target: Actor) {
	const id = crypto.randomUUID()

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

export async function removeFollowing(db: D1Database, actor: Actor, target: Actor) {
	const query = `
		DELETE FROM actor_following WHERE actor_id=? AND target_actor_id=?
	`

	const out = await db.prepare(query).bind(actor.id.toString(), target.id.toString()).run()
	if (!out.success) {
		throw new Error('SQL error: ' + out.error)
	}
}

export function getFollowingAcct(db: D1Database, actor: Actor): Promise<Array<string>> {
	const query = `
		SELECT target_actor_acct FROM actor_following WHERE actor_id=? AND state=?
	`
	const statement = db.prepare(query).bind(actor.id.toString(), STATE_ACCEPTED)

	return getResultsField(statement, 'target_actor_acct')
}

export function getFollowingRequestedAcct(db: D1Database, actor: Actor): Promise<Array<string>> {
	const query = `
		SELECT target_actor_acct FROM actor_following WHERE actor_id=? AND state=?
	`

	const statement = db.prepare(query).bind(actor.id.toString(), STATE_PENDING)

	return getResultsField(statement, 'target_actor_acct')
}

export function getFollowingId(db: D1Database, actor: Actor): Promise<Array<string>> {
	const query = `
		SELECT target_actor_id FROM actor_following WHERE actor_id=? AND state=?
	`

	const statement = db.prepare(query).bind(actor.id.toString(), STATE_ACCEPTED)

	return getResultsField(statement, 'target_actor_id')
}

export function getFollowers(db: D1Database, actor: Actor): Promise<Array<string>> {
	const query = `
		SELECT actor_id FROM actor_following WHERE target_actor_id=? AND state=?
	`

	const statement = db.prepare(query).bind(actor.id.toString(), STATE_ACCEPTED)

	return getResultsField(statement, 'actor_id')
}
