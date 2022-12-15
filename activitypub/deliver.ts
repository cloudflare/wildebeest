// https://www.w3.org/TR/activitypub/#delivery

import type { Activity } from './activities/'
import type { Actor } from './actors/'
import { generateDigestHeader } from 'wildebeest/utils/http-signing-cavage'
import { signRequest } from 'wildebeest/utils/http-signing'

const headers = {
    accept: 'application/ld+json',
}

export async function deliver(signingKey: CryptoKey, to: Actor, activity: Activity) {
    const body = JSON.stringify(activity)
    let req = new Request(to.inbox, {
        method: 'POST',
        body: body,
        headers,
    })
    const digest = await generateDigestHeader(body)
    req.headers.set('Digest', digest)
    await signRequest(req, signingKey, 'KEYid') // TODO: Key id should be URL

    const res = await fetch(req)
    if (!res.ok) {
        const body = await res.text()
        throw new Error(`delivery to ${to.inbox} returned ${res.status}: ${body}`)
    }
}
