// https://www.w3.org/TR/activitypub/#delivery

import { instanceConfig } from 'wildebeest/config/instance'
import type { Activity } from './activities/'
import type { Actor } from './actors/'
import { generateDigestHeader } from 'wildebeest/utils/http-signing-cavage'
import { signRequest } from 'wildebeest/utils/http-signing'

const headers = {
    accept: 'application/ld+json',
}

export async function deliver(signingKey: CryptoKey, from: Actor, to: Actor, activity: Activity) {
    const body = JSON.stringify(activity)
    let req = new Request(to.inbox, {
        method: 'POST',
        body: body,
        headers,
    })
    const digest = await generateDigestHeader(body)
    req.headers.set('Digest', digest)
    await signRequest(req, signingKey, new URL(from.id))

    const res = await fetch(req)
    if (!res.ok) {
        const body = await res.text()
        throw new Error(`delivery to ${to.inbox} returned ${res.status}: ${body}`)
    }
    {
        const body = await res.text()
        console.log(`${to.inbox} returned 200: ${body}`)
    }
}
