// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-like

import type { Actor } from '../actors'
import type { Activity } from '.'

const Like = 'Like'

export function create(actor: Actor, object: URL): Activity {
	return {
		'@context': 'https://www.w3.org/ns/activitystreams',
		type: Like,
		actor: actor.id,
		object,
	}
}
