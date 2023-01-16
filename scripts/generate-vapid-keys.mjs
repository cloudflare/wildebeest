import { webcrypto } from 'node:crypto'

const key = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const serverKey = await webcrypto.subtle.exportKey('jwk', key.privateKey)

console.log(JSON.stringify(serverKey))
