// https://www.w3.org/TR/activitypub/#delivery

import type { Activity } from './activities/'
import type { Actor } from './actors/'
import type { Handle } from '../utils/parse'

const headers = {
    accept: 'application/ld+json',
}

export async function deliver(to: Actor, activity: Activity) {
    const res = await fetch(to.inbox, {
        method: 'POST',
        body: JSON.stringify(activity),
        headers,
    })

    if (!res.ok) {
        const body = await res.text()
        throw new Error(`delivery to ${to.inbox} returned ${res.status}: ${body}`)
    }
}
