import { importPublicKey, str2ab } from '../key-ops'
import { ParsedSignature } from './parser'

interface Profile {
	publicKey: {
		id: string
		owner: string
		publicKeyPem: string
	}
}

export async function verifySignature(parsedSignature: ParsedSignature, key: CryptoKey): Promise<boolean> {
	return crypto.subtle.verify(
		'RSASSA-PKCS1-v1_5',
		key,
		str2ab(parsedSignature.signature),
		str2ab(parsedSignature.signingString)
	)
}

export async function fetchKey(parsedSignature: ParsedSignature): Promise<CryptoKey> {
	const response = await fetch(parsedSignature.keyId, {
		method: 'GET',
		headers: { Accept: 'application/activity+json' },
	})

	const parsedResponse = (await response.json()) as Profile
	return importPublicKey(parsedResponse.publicKey.publicKeyPem)
}
