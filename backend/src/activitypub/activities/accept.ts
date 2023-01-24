import type { APObject } from '../objects'
import type { Actor } from '../actors'
import type { Activity } from '.'

const ACCEPT = 'Accept'

export function create(actor: Actor, object: APObject): Activity {
	return {
		'@context': 'https://www.w3.org/ns/activitystreams',
		type: ACCEPT,
		actor: actor.id,
		object,
	}
}
