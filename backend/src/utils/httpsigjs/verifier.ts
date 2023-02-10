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
		str2ab(atob(parsedSignature.signature)),
		str2ab(parsedSignature.signingString)
	)
}

export async function fetchKey(parsedSignature: ParsedSignature): Promise<CryptoKey | null> {
	const url = parsedSignature.keyId
	const res = await fetch(url, {
		headers: { Accept: 'application/activity+json' },
	})
	if (!res.ok) {
		console.warn(`failed to fetch keys from "${url}", returned ${res.status}.`)
		return null
	}

	const parsedResponse = (await res.json()) as Profile
	return importPublicKey(parsedResponse.publicKey.publicKeyPem)
}
