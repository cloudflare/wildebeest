import type { JWK } from './jwk'
import type { WebPushInfos } from './webpushinfos'
import {
	b64ToUrlEncoded,
	cryptoKeysToUint8Array,
	exportPublicKeyPair,
	joinUint8Arrays,
	stringToU8Array,
	u8ToString,
} from './util'
import { hkdfGenerate } from './hkdf'
import { urlsafeBase64Decode } from 'wildebeest/backend/src/utils/key-ops'

const encoder = new TextEncoder()

type mKeyPair = {
	publicKey: CryptoKey
	privateKey: CryptoKey
}

async function generateSalt(): Promise<Uint8Array> {
	return crypto.getRandomValues(new Uint8Array(16))
}

async function getSubKeyAsCryptoKey(subscription: WebPushInfos): Promise<CryptoKey> {
	const key = urlsafeBase64Decode(subscription.key)
	const publicKey = await crypto.subtle.importKey(
		'jwk',
		{
			kty: 'EC',
			crv: 'P-256',
			x: b64ToUrlEncoded(btoa(key.slice(1, 33))),
			y: b64ToUrlEncoded(btoa(key.slice(33, 65))),
			ext: true,
		},
		{
			name: 'ECDH',
			namedCurve: 'P-256',
		},
		true,
		[]
	)
	return publicKey
}

async function getSharedSecret(subscription: WebPushInfos, serverKeys: mKeyPair): Promise<ArrayBuffer> {
	const publicKey = await getSubKeyAsCryptoKey(subscription)
	const algorithm = {
		name: 'ECDH',
		namedCurve: 'P-256',
		public: publicKey,
	}
	return await crypto.subtle.deriveBits(algorithm, serverKeys.privateKey, 256)
}

export async function generateContext(subscription: WebPushInfos, serverKeys: mKeyPair): Promise<Uint8Array> {
	const subKey = await getSubKeyAsCryptoKey(subscription)

	const [clientPublicKey, serverPublicKey] = await Promise.all([
		cryptoKeysToUint8Array(subKey).then((key) => key.publicKey),
		cryptoKeysToUint8Array(serverKeys.publicKey).then((key) => key.publicKey),
	])

	const labelUnit8Array = stringToU8Array('P-256\x00')

	const clientPublicKeyLengthUnit8Array = new Uint8Array(2)
	clientPublicKeyLengthUnit8Array[0] = 0x00
	clientPublicKeyLengthUnit8Array[1] = clientPublicKey.byteLength

	const serverPublicKeyLengthBuffer = new Uint8Array(2)
	serverPublicKeyLengthBuffer[0] = 0x00
	serverPublicKeyLengthBuffer[1] = serverPublicKey.byteLength

	return joinUint8Arrays([
		labelUnit8Array,
		clientPublicKeyLengthUnit8Array,
		clientPublicKey,
		serverPublicKeyLengthBuffer,
		serverPublicKey,
	])
}

async function generatePRK(subscription: WebPushInfos, serverKeys: mKeyPair): Promise<ArrayBuffer> {
	const sharedSecret = await getSharedSecret(subscription, serverKeys)
	const token = 'Content-Encoding: auth\x00'
	const authInfoUint8Array = stringToU8Array(token)
	return await hkdfGenerate(
		sharedSecret,
		stringToU8Array(urlsafeBase64Decode(subscription.auth)),
		authInfoUint8Array,
		32
	)
}

async function generateCEKInfo(subscription: WebPushInfos, serverKeys: mKeyPair): Promise<Uint8Array> {
	const token = 'Content-Encoding: aesgcm\x00'
	const contentEncoding8Array = stringToU8Array(token)
	const contextBuffer = await generateContext(subscription, serverKeys)
	return joinUint8Arrays([contentEncoding8Array, contextBuffer])
}

async function generateNonceInfo(subscription: WebPushInfos, serverKeys: mKeyPair): Promise<Uint8Array> {
	const token = 'Content-Encoding: nonce\x00'
	const contentEncoding8Array = stringToU8Array(token)
	const contextBuffer = await generateContext(subscription, serverKeys)
	return joinUint8Arrays([contentEncoding8Array, contextBuffer])
}

export async function generateEncryptionKeys(
	subscription: WebPushInfos,
	salt: Uint8Array,
	serverKeys: mKeyPair
): Promise<{ contentEncryptionKey: ArrayBuffer; nonce: ArrayBuffer }> {
	const [prk, cekInfo, nonceInfo] = await Promise.all([
		generatePRK(subscription, serverKeys),
		generateCEKInfo(subscription, serverKeys),
		generateNonceInfo(subscription, serverKeys),
	])
	const [contentEncryptionKey, nonce] = await Promise.all([
		hkdfGenerate(prk, salt, cekInfo, 16),
		hkdfGenerate(prk, salt, nonceInfo, 12),
	])
	return { contentEncryptionKey, nonce }
}

async function generateServerKey(): Promise<mKeyPair> {
	return (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
		'deriveBits',
	])) as unknown as mKeyPair
}

export async function generateAESGCMEncryptedMessage(
	payloadText: string,
	subscription: WebPushInfos
): Promise<{
	cipherText: ArrayBuffer
	salt: string
	publicServerKey: string
}> {
	const salt = await generateSalt()
	const serverKeys = await generateServerKey()
	const exportedServerKey = (await crypto.subtle.exportKey('jwk', serverKeys.publicKey)) as unknown as JWK
	const encryptionKeys = await generateEncryptionKeys(subscription, salt, serverKeys)
	const contentEncryptionCryptoKey = await crypto.subtle.importKey(
		'raw',
		encryptionKeys.contentEncryptionKey,
		'AES-GCM',
		true,
		['decrypt', 'encrypt']
	)

	const paddingBytes = 0
	const paddingUnit8Array = new Uint8Array(2 + paddingBytes)
	const payloadUint8Array = encoder.encode(payloadText)
	const recordUint8Array = new Uint8Array(paddingUnit8Array.byteLength + payloadUint8Array.byteLength)
	recordUint8Array.set(paddingUnit8Array, 0)
	recordUint8Array.set(payloadUint8Array, paddingUnit8Array.byteLength)

	const encryptedPayloadArrayBuffer = await crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			tagLength: 128,
			iv: encryptionKeys.nonce,
		},
		contentEncryptionCryptoKey,
		recordUint8Array
	)

	return {
		cipherText: encryptedPayloadArrayBuffer,
		salt: b64ToUrlEncoded(btoa(u8ToString(salt))),
		publicServerKey: b64ToUrlEncoded(exportPublicKeyPair(exportedServerKey)),
	}
}
