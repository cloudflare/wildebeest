import { createPerson, getPersonByEmail, type Person } from 'wildebeest/backend/src/activitypub/actors'
import { reblogs, replies, statuses } from 'wildebeest/frontend/src/dummyData'
import type { Account, MastodonStatus } from 'wildebeest/frontend/src/types'
import { Note } from 'wildebeest/backend/src/activitypub/objects/note'
import { createReblog } from 'wildebeest/backend/src/mastodon/reblog'
import { createReply as createReplyInBackend } from 'wildebeest/backend/test/shared.utils'
import { createStatus } from 'wildebeest/backend/src/mastodon/status'
import type { APObject } from 'wildebeest/backend/src/activitypub/objects'
import { type Database } from 'wildebeest/backend/src/database'
import { upsertRule } from 'wildebeest/backend/src/config/rules'
import { upsertServerSettings } from 'wildebeest/backend/src/config/server'

/**
 * Run helper commands to initialize the database with actors, statuses, etc.
 */
export async function init(domain: string, db: Database) {
	const loadedStatuses: { status: MastodonStatus; note: Note }[] = []
	for (const status of statuses) {
		const actor = await getOrCreatePerson(domain, db, status.account)
		const note = await createStatus(
			domain,
			db,
			actor,
			status.content,
			status.media_attachments as unknown as APObject[],
			{ spoiler_text: status.spoiler_text }
		)
		loadedStatuses.push({ status, note })
	}

	for (const reblog of reblogs) {
		const rebloggerAccount = reblog.account
		const reblogger = await getOrCreatePerson(domain, db, rebloggerAccount)
		const reblogStatus = reblog.reblog
		if (reblogStatus?.id) {
			const noteToReblog = loadedStatuses.find(({ status: { id } }) => id === reblogStatus.id)?.note
			if (noteToReblog) {
				await createReblog(db, reblogger, noteToReblog)
			}
		}
	}

	for (const reply of replies) {
		await createReply(domain, db, reply, loadedStatuses)
	}

	await createServerData(db)
}

async function createServerData(db: Database) {
	await upsertServerSettings(db, {
		'extended description': 'this is a test wildebeest instance!',
	})
	await upsertRule(db, "don't be mean")
	await upsertRule(db, "don't insult people")
	await upsertRule(db, 'respect the rules')
}

/**
 * Creates a reply for a note (representing a status)
 */
async function createReply(
	domain: string,
	db: Database,
	reply: MastodonStatus,
	loadedStatuses: { status: MastodonStatus; note: Note }[]
) {
	if (!reply.in_reply_to_id) {
		console.warn(`Ignoring reply with id ${reply.id} since it doesn't have a in_reply_to_id field`)
		return
	}

	const originalStatus = loadedStatuses.find(({ status: { id } }) => id === reply.in_reply_to_id)
	if (!originalStatus) {
		console.warn(
			`Ignoring reply with id ${reply.id} since no status matching the in_reply_to_id ${reply.in_reply_to_id} has been found`
		)
		return
	}

	const actor = await getOrCreatePerson(domain, db, reply.account)
	await createReplyInBackend(domain, db, actor, originalStatus.note, reply.content)
}

async function getOrCreatePerson(
	domain: string,
	db: Database,
	{ username, avatar, display_name }: Account
): Promise<Person> {
	const isAdmin = username === 'george'
	const email = `${username}@test.email`
	const person = await getPersonByEmail(db, email)
	if (person) return person
	const newPerson = await createPerson(
		domain,
		db,
		'test-kek',
		email,
		{
			icon: { url: avatar },
			name: display_name,
		},
		isAdmin
	)
	if (!newPerson) {
		throw new Error('Could not create Actor ' + username)
	}
	return newPerson
}
