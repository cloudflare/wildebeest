import type { Object } from '../objects/'
import type { Actor } from '../actors/'
import type { Activity } from './'

const ACCEPT = 'Accept'

export function create(actor: Actor, object: Object): Activity {
    return {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: ACCEPT,
        actor: actor.id,
        object,
    }
}
