import { str2ab } from '../key-ops'
import { ParsedSignature } from './parser'

export async function verifySignature(parsedSignature: ParsedSignature, key: CryptoKey): Promise<boolean> {
	return crypto.subtle.verify(
		'RSASSA-PKCS1-v1_5',
		key,
		str2ab(parsedSignature.signature),
		str2ab(parsedSignature.signingString)
	)
}
