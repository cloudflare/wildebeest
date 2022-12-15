import { strict as assert } from 'node:assert/strict'

import { parseHandle } from '../utils/parse'

import { generateUserKey, unwrapPrivateKey, importPublicKey } from 'wildebeest/utils/key-ops'
import { signRequest } from 'wildebeest/utils/http-signing'
import { generateDigestHeader } from 'wildebeest/utils/http-signing-cavage'

describe('utils', () => {
    test('user key lifecycle', async () => {
        const user_kek = 'userkey'
        const userKeyPair = await generateUserKey(user_kek)
        await unwrapPrivateKey(user_kek, userKeyPair.wrappedPrivKey, userKeyPair.salt)
        await importPublicKey(userKeyPair.pubKey)
    })

    test('request signing', async () => {
        const body = '{"foo": "bar"}'
        const digest = await generateDigestHeader(body)
        const request = new Request('https://example.com', {
            method: 'POST',
            body: body,
            headers: { header1: 'value1', Digest: digest },
        })
        const user_kek = 'userkey'
        const userKeyPair = await generateUserKey(user_kek)
        const privateKey = await unwrapPrivateKey(user_kek, userKeyPair.wrappedPrivKey, userKeyPair.salt)
        await signRequest(request, privateKey, 'KEYid')
        assert(request.headers.has('Signature'), 'no signature in signed request')
    })

    test('handle parsing', async () => {
        let res

        res = parseHandle('')
        assert.equal(res.localPart, '')
        assert.equal(res.domain, null)

        res = parseHandle('@a')
        assert.equal(res.localPart, 'a')
        assert.equal(res.domain, null)

        res = parseHandle('a')
        assert.equal(res.localPart, 'a')
        assert.equal(res.domain, null)

        res = parseHandle('@a@remote.com')
        assert.equal(res.localPart, 'a')
        assert.equal(res.domain, 'remote.com')

        res = parseHandle('a@remote.com')
        assert.equal(res.localPart, 'a')
        assert.equal(res.domain, 'remote.com')

        res = parseHandle('a%40masto.ai')
        assert.equal(res.localPart, 'a')
        assert.equal(res.domain, 'masto.ai')
    })
})
