import type { APObject } from '../objects'
import type { Actor } from '../actors'
import type { Activity } from '.'
import * as activity from '.'

const UPDATE = 'Update'

export function create(domain: string, actor: Actor, object: APObject): Activity {
	return {
		'@context': ['https://www.w3.org/ns/activitystreams'],
		id: activity.uri(domain),
		type: UPDATE,
		actor: actor.id,
		object,
	}
}
