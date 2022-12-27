import type { Note } from '../objects/note'
import type { Actor } from '../actors'
import type { Activity } from '.'
import * as activity from '.'

const CREATE = 'Create'

export function create(domain: string, actor: Actor, object: Note): Activity {
	const a: Activity = {
		'@context': [
			'https://www.w3.org/ns/activitystreams',
			{
				ostatus: 'http://ostatus.org#',
				atomUri: 'ostatus:atomUri',
				inReplyToAtomUri: 'ostatus:inReplyToAtomUri',
				conversation: 'ostatus:conversation',
				sensitive: 'as:sensitive',
				toot: 'http://joinmastodon.org/ns#',
				votersCount: 'toot:votersCount',
			},
		],
		id: activity.uri(domain),
		type: CREATE,
		actor: actor.id,
		object,
	}

	if (object.published) {
		a.published = object.published
	}
	if (object.to) {
		a.to = object.to
	}
	if (object.cc) {
		a.cc = object.cc
	}

	return a
}
