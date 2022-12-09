function arrayBufferToBase64(buffer: ArrayBuffer): String {
    var binary = ''
    var bytes = new Uint8Array(buffer)
    var len = bytes.byteLength
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
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
async function wrapCryptoKey(keyToWrap: CryptoKey, user_kek: string): Promise<ArrayBuffer> {
    // get the key encryption key
    const keyMaterial = await getKeyMaterial(user_kek)
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const wrappingKey = await getKey(keyMaterial, salt)

    return crypto.subtle.wrapKey('jwk', keyToWrap, wrappingKey, 'AES-KW')
}

/*
Generate a new wrapped user key
*/
export async function generateUserKey(user_kek: string): Promise<{ wrappedPrivKey: ArrayBuffer; pubKey: String }> {
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

    const wrappedPrivKey = await wrapCryptoKey((keyPair as CryptoKeyPair).privateKey, user_kek)
    const pubKeyBuf = (await crypto.subtle.exportKey('spki', (keyPair as CryptoKeyPair).publicKey)) as ArrayBuffer
    const pubKeyAsBase64 = arrayBufferToBase64(pubKeyBuf)
    const pubKey = `-----BEGIN PUBLIC KEY-----\n${pubKeyAsBase64}\n-----END PUBLIC KEY-----`

    return { wrappedPrivKey, pubKey }
}
