import { createPerson, getPersonByEmail, type Person } from 'wildebeest/backend/src/activitypub/actors'
import * as statusesAPI from 'wildebeest/functions/api/v1/statuses'
import { statuses } from 'wildebeest/frontend/src/dummyData'
import type { MastodonStatus } from 'wildebeest/frontend/src/types'
import type { MastodonAccount } from 'wildebeest/backend/src/types'
import { configure } from 'wildebeest/backend/src/config'

const kek = 'test-kek'
/**
 * Run helper commands to initialize the database with actors, statuses, etc.
 */
export async function init(domain: string, db: D1Database) {
	configure(db, {
		title: 'Wildebeest',
		email: '',
		description: 'Wildebeest dev instance',
		thumbnail: '/assets/wildebeest-logo.png',
	})

	for (const status of statuses as MastodonStatus[]) {
		const actor = await getOrCreatePerson(domain, db, status.account.username)
		await createStatus(db, actor, status.content)
	}
}

/**
 * Create a status object in the given actors outbox.
 */
async function createStatus(db: D1Database, actor: Person, status: string, visibility = 'public') {
	const body = {
		status,
		visibility,
	}
	const req = new Request('https://example.com', {
		method: 'POST',
		body: JSON.stringify(body),
	})
	await statusesAPI.handleRequest(req, db, actor, kek)
}

async function getOrCreatePerson(domain: string, db: D1Database, username: string): Promise<Person> {
	const person = await getPersonByEmail(db, username)
	if (person) return person
	const newPerson = await createPerson(domain, db, kek, username)
	if (!newPerson) {
		throw new Error('Could not create Actor ' + username)
	}
	return newPerson
}
