import { makeDB, assertCache } from './utils'
import { strict as assert } from 'node:assert/strict'

import * as ap_users from '../functions/ap/users/[id]'

describe('ActivityPub', () => {
    test('fetch non-existant user by id', async () => {
        const db = await makeDB()

        const res = await ap_users.handleRequest(db, 'nonexisting')
        assert.equal(res.status, 404)
    })

    test('fetch user by id', async () => {
        const db = await makeDB()
        const properties = { summary: 'test summary' }
        const pubKey =
            '-----BEGIN PUBLIC KEY-----MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEApnI8FHJQXqqAdM87YwVseRUqbNLiw8nQ0zHBUyLylzaORhI4LfW4ozguiw8cWYgMbCufXMoITVmdyeTMGbQ3Q1sfQEcEjOZZXEeCCocmnYjK6MFSspjFyNw6GP0a5A/tt1tAcSlgALv8sg1RqMhSE5Kv+6lSblAYXcIzff7T2jh9EASnimaoAAJMaRH37+HqSNrouCxEArcOFhmFETadXsv+bHZMozEFmwYSTugadr4WD3tZd+ONNeimX7XZ3+QinMzFGOW19ioVHyjt3yCDU1cPvZIDR17dyEjByNvx/4N4Zly7puwBn6Ixy/GkIh5BWtL5VOFDJm/S+zcf1G1WsOAXMwKL4Nc5UWKfTB7Wd6voId7vF7nI1QYcOnoyh0GqXWhTPMQrzie4nVnUrBedxW0s/0vRXeR63vTnh5JrTVu06JGiU2pq2kvwqoui5VU6rtdImITybJ8xRkAQ2jo4FbbkS6t49PORIuivxjS9wPl7vWYazZtDVa5g/5eL7PnxOG3HsdIJWbGEh1CsG83TU9burHIepxXuQ+JqaSiKdCVc8CUiO++acUqKp7lmbYR9E/wRmvxXDFkxCZzA0UL2mRoLLLOe4aHvRSTsqiHC5Wwxyew5bb+eseJz3wovid9ZSt/tfeMAkCDmaCxEK+LGEbJ9Ik8ihis8Esm21N0A54sCAwEAAQ==-----END PUBLIC KEY-----'
        await db
            .prepare('INSERT INTO actors (id, email, type, properties, pubkey) VALUES (?, ?, ?, ?, ?)')
            .bind('sven', 'sven@cloudflare.com', 'Person', JSON.stringify(properties), pubKey)
            .run()

        const res = await ap_users.handleRequest(db, 'sven')
        assert.equal(res.status, 200)

        const data = await res.json<any>()
        assert.equal(data.summary, 'test summary')
        assert.equal(data.id, 'sven')
        assert.equal(data.publicKey.publicKeyPem, pubKey)
    })
})
