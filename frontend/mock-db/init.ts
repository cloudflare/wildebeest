import { createPerson, getPersonByEmail, type Person } from 'wildebeest/backend/src/activitypub/actors'
import * as statusesAPI from 'wildebeest/functions/api/v1/statuses'
import * as reblogAPI from 'wildebeest/functions/api/v1/statuses/[id]/reblog'
import { statuses } from 'wildebeest/frontend/src/dummyData'
import type { Account, MastodonStatus } from 'wildebeest/frontend/src/types'

const kek = 'test-kek'
/**
 * Run helper commands to initialize the database with actors, statuses, etc.
 */
export async function init(domain: string, db: D1Database) {
	const loadedStatuses: MastodonStatus[] = []
	for (const status of statuses) {
		const actor = await getOrCreatePerson(domain, db, status.account)
		loadedStatuses.push(await createStatus(db, actor, status.content))
	}

	const reblogger = await getOrCreatePerson(domain, db, loadedStatuses[1].account)
	await reblogStatus(db, reblogger, loadedStatuses[2])
}

/**
 * Create a status object in the given actors outbox.
 */
async function createStatus(db: D1Database, actor: Person, status: string, visibility = 'public') {
	const body = {
		status,
		visibility,
	}
	const headers = {
		'content-type': 'application/json',
	}
	const req = new Request('https://example.com', {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
	})
	return (await (await statusesAPI.handleRequest(req, db, actor, kek)).json()) as MastodonStatus
}

async function getOrCreatePerson(
	domain: string,
	db: D1Database,
	{ username, avatar, display_name }: Account
): Promise<Person> {
	const person = await getPersonByEmail(db, username)
	if (person) return person
	const newPerson = await createPerson(domain, db, kek, username, {
		icon: { url: avatar },
		name: display_name,
	})
	if (!newPerson) {
		throw new Error('Could not create Actor ' + username)
	}
	return newPerson
}

async function reblogStatus(db: D1Database, actor: Person, status: MastodonStatus) {
	await reblogAPI.handleRequest(db, status.id, actor, kek)
}
