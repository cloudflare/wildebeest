import { strict as assert } from 'node:assert/strict'

import { parseHandle } from '../utils/parse'

describe('utils', () => {
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
