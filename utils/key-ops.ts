export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
}

// from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
export function str2ab(str: string): ArrayBuffer {
    const buf = new ArrayBuffer(str.length)
    const bufView = new Uint8Array(buf)
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i)
    }
    return buf
}

/*
Get some key material to use as input to the deriveKey method.
The key material is a password not stored in the DB.
*/
function getKeyMaterial(password: string): Promise<CryptoKey> {
    const enc = new TextEncoder()
    return crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey'])
}

/*
Given some key material and some random salt
derive an AES-KW key using PBKDF2.
*/
function getKey(keyMaterial: CryptoKey, salt: ArrayBuffer): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-KW', length: 256 },
        true,
        ['wrapKey', 'unwrapKey']
    )
}

/*
Wrap the given key.
*/
async function wrapCryptoKey(
    keyToWrap: CryptoKey,
    user_kek: string
): Promise<{ wrappedPrivKey: ArrayBuffer; salt: Uint8Array }> {
    // get the key encryption key
    const keyMaterial = await getKeyMaterial(user_kek)
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const wrappingKey = await getKey(keyMaterial, salt)
    const wrappedPrivKey = await crypto.subtle.wrapKey('jwk', keyToWrap, wrappingKey, 'AES-KW')

    return { wrappedPrivKey, salt }
}

/*
Generate a new wrapped user key
*/
export async function generateUserKey(
    user_kek: string
): Promise<{ wrappedPrivKey: ArrayBuffer; salt: Uint8Array; pubKey: string }> {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
        true,
        ['sign', 'verify']
    )

    const { wrappedPrivKey, salt } = await wrapCryptoKey((keyPair as CryptoKeyPair).privateKey, user_kek)
    const pubKeyBuf = (await crypto.subtle.exportKey('spki', (keyPair as CryptoKeyPair).publicKey)) as ArrayBuffer
    const pubKeyAsBase64 = arrayBufferToBase64(pubKeyBuf)
    const pubKey = `-----BEGIN PUBLIC KEY-----\n${pubKeyAsBase64}\n-----END PUBLIC KEY-----`

    return { wrappedPrivKey, salt, pubKey }
}

/*
Unwrap and import private key
*/
export async function unwrapPrivateKey(
    user_kek: string,
    wrappedPrivKey: ArrayBuffer,
    salt: Uint8Array
): Promise<CryptoKey> {
    const keyMaterial = await getKeyMaterial(user_kek)
    const wrappingKey = await getKey(keyMaterial, salt)
    return crypto.subtle.unwrapKey(
        'jwk',
        wrappedPrivKey,
        wrappingKey,
        'AES-KW',
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256',
        },
        true,
        ['sign']
    )
}

/*
Import public key
*/
export async function importPublicKey(exportedKey: string): Promise<CryptoKey> {
    // fetch the part of the PEM string between header and footer
    const pemHeader = '-----BEGIN PUBLIC KEY-----'
    const pemFooter = '-----END PUBLIC KEY-----'
    const pemContents = exportedKey.substring(pemHeader.length, exportedKey.length - pemFooter.length)

    // base64 decode the string to get the binary data
    const binaryDerString = atob(pemContents)

    // convert from a binary string to an ArrayBuffer
    const binaryDer = str2ab(binaryDerString)

    return crypto.subtle.importKey(
        'spki',
        binaryDer,
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256',
        },
        true,
        ['verify']
    )
}
