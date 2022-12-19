import type { Object } from '../objects/'
import type { Actor } from '../actors/'
import type { Activity } from './'

const CREATE = 'Create'

export function create(actor: Actor, object: Object): Activity {
	return {
		'@context': 'https://www.w3.org/ns/activitystreams',
		type: CREATE,
		actor: actor.id,
		object,
	}
}
