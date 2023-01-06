// https://www.w3.org/TR/activitystreams-vocabulary/#dfn-announce

import type { Actor } from '../actors'
import type { Activity } from '.'

const ANNOUNCE = 'Announce'

export function create(actor: Actor, object: URL): Activity {
	return {
		'@context': 'https://www.w3.org/ns/activitystreams',
		type: ANNOUNCE,
		actor: actor.id,
		object,
	}
}
