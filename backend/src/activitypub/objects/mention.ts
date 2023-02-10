import type { Link } from 'wildebeest/backend/src/activitypub/objects/link'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'

export interface Mention extends Link {}

export function newMention(actor: Actor): Mention {
	return {
		type: 'Mention',
		id: actor.id,
		url: actor.id,

		href: actor.id,
		name: urlToHandle(actor.id),
	}
}
