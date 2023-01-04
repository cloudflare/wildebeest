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
			iterations: 10000,
			hash: 'SHA-256',
		},
		keyMaterial,
		{ name: 'AES-GCM', length: 256 },
		true,
		['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
	)
}

/*
Wrap the given key.
*/
async function wrapCryptoKey(
	keyToWrap: CryptoKey,
	userKEK: string
): Promise<{ wrappedPrivKey: ArrayBuffer; salt: Uint8Array }> {
	// get the key encryption key
	const keyMaterial = await getKeyMaterial(userKEK)
	const salt = crypto.getRandomValues(new Uint8Array(16))
	const wrappingKey = await getKey(keyMaterial, salt)
	const bytesToWrap = await crypto.subtle.exportKey('pkcs8', keyToWrap)
	const wrappedPrivKey = await crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv: salt,
		},
		wrappingKey,
		bytesToWrap as ArrayBuffer
	)

	return { wrappedPrivKey, salt }
}

/*
Generate a new wrapped user key
*/
export async function generateUserKey(
	userKEK: string
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

	const { wrappedPrivKey, salt } = await wrapCryptoKey((keyPair as CryptoKeyPair).privateKey, userKEK)
	const pubKeyBuf = (await crypto.subtle.exportKey('spki', (keyPair as CryptoKeyPair).publicKey)) as ArrayBuffer
	const pubKeyAsBase64 = arrayBufferToBase64(pubKeyBuf)
	const pubKey = `-----BEGIN PUBLIC KEY-----\n${pubKeyAsBase64}\n-----END PUBLIC KEY-----`

	return { wrappedPrivKey, salt, pubKey }
}

/*
Unwrap and import private key
*/
export async function unwrapPrivateKey(
	userKEK: string,
	wrappedPrivKey: ArrayBuffer,
	salt: Uint8Array
): Promise<CryptoKey> {
	const keyMaterial = await getKeyMaterial(userKEK)
	const wrappingKey = await getKey(keyMaterial, salt)
	const keyBytes = await crypto.subtle.decrypt(
		{
			name: 'AES-GCM',
			iv: salt,
		},
		wrappingKey,
		wrappedPrivKey
	)
	return await crypto.subtle.importKey(
		'pkcs8',
		keyBytes,
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
	const trimmed = exportedKey.trim()
	const pemHeader = '-----BEGIN PUBLIC KEY-----'
	const pemFooter = '-----END PUBLIC KEY-----'
	const pemContents = trimmed.substring(pemHeader.length, trimmed.length - pemFooter.length)

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

const DEC = {
	'-': '+',
	_: '/',
	'.': '=',
} as const
type KeyOfDEC = keyof typeof DEC
export function urlsafeBase64Decode(v: string) {
	return atob(v.replace(/[-_.]/g, (m: string) => DEC[m as KeyOfDEC]))
}
