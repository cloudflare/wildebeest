import type { APObject } from '../objects'
import type { Actor } from '../actors'
import type { Activity } from '.'

const FOLLOW = 'Follow'

export function create(actor: Actor, object: APObject): Activity {
	return {
		'@context': 'https://www.w3.org/ns/activitystreams',
		type: FOLLOW,
		actor: actor.id,
		object: object.id,
	}
}
