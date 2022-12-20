import type { Handle } from '../utils/parse'
import type { Object } from 'wildebeest/activitypub/objects/'
import { instanceConfig } from 'wildebeest/config/instance'
import { loadExternalMastodonAccount } from 'wildebeest/mastodon/account'
import * as actors from 'wildebeest/activitypub/actors/'
import * as objects from 'wildebeest/activitypub/objects/'
import type { MastodonAccount, MastodonStatus } from 'wildebeest/types/'
import { parseHandle } from '../utils/parse'
import { urlToHandle } from '../utils/handle'

export function getMentions(input: string): Array<Handle> {
	const mentions: Array<Handle> = []

	for (let i = 0, len = input.length; i < len; i++) {
		if (input[i] === '@') {
			let buffer = ''
			for (; ; i++) {
				if (input[i] === ' ') {
					break
				}
				buffer += input[i]
			}

			mentions.push(parseHandle(buffer))
		}
	}

	return mentions
}

export async function toMastodonStatus(obj: Object): Promise<MastodonStatus | null> {
	if (obj.originalActorId === undefined) {
		console.warn('missing `obj.originalActorId`')
		return null
	}

	const actorId = new URL(obj.originalActorId)
	const actor = await actors.get(actorId)

	const acct = urlToHandle(actorId)
	const account = loadExternalMastodonAccount(acct, actor)

	return {
		// Default values
		emojis: [],
		media_attachments: [],
		tags: [],
		mentions: [],

		// TODO: stub values
		visibility: 'public',
		spoiler_text: '',

		content: obj.content || '',
		id: obj.id,
		uri: obj.url,
		created_at: obj.published || '',
		account,
	}
}
