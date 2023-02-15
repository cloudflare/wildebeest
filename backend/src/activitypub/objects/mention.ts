import type { Link } from 'wildebeest/backend/src/activitypub/objects/link'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'

// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-mention
export interface Mention extends Link {}

export function newMention(actor: Actor): Mention {
	return {
		type: 'Mention',
		href: actor.id,
		name: urlToHandle(actor.id),
	}
}
