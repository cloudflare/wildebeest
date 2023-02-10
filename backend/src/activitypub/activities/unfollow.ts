import type { APObject } from '../objects'
import type { Actor } from '../actors'
import type { Activity } from '.'
import * as follow from './follow'

const UNDO = 'Undo'

export function create(actor: Actor, object: APObject): Activity {
	return {
		'@context': 'https://www.w3.org/ns/activitystreams',
		type: UNDO,
		actor: actor.id,
		object: follow.create(actor, object),
	}
}
