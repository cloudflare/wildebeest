export async function hmacSign(ikm: Uint8Array | ArrayBuffer, input: ArrayBuffer): Promise<ArrayBuffer> {
	const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
	return await crypto.subtle.sign('HMAC', key, input)
}

export async function hkdfGenerate(
	ikm: ArrayBuffer,
	salt: Uint8Array,
	info: Uint8Array,
	byteLength: number
): Promise<ArrayBuffer> {
	const fullInfoBuffer = new Uint8Array(info.byteLength + 1)
	fullInfoBuffer.set(info, 0)
	fullInfoBuffer.set(new Uint8Array(1).fill(1), info.byteLength)
	const prk = await hmacSign(salt, ikm)
	const nextPrk = await hmacSign(prk, fullInfoBuffer)
	return nextPrk.slice(0, byteLength)
}
