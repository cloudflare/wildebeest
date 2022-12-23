import type { Object } from '../objects'
import type { Actor } from '../actors'
import type { Activity } from '.'
import * as activity from '.'

const UPDATE = 'Update'

export function create(actor: Actor, object: Object): Activity {
	return {
		'@context': ['https://www.w3.org/ns/activitystreams'],
		id: activity.uri(),
		type: UPDATE,
		actor: actor.id,
		object,
	}
}
