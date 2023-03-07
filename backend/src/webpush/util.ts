// note:
// all util functions return normal b64 NOT URL safe b64
// use b64ToUrlEncoded to convert to URL safe b64

function ArrayToHex(byteArray: Uint8Array): string {
	return Array.prototype.map
		.call(byteArray, (byte: number) => {
			return ('0' + (byte & 0xff).toString(16)).slice(-2)
		})
		.join('')
}

export function generateRandomId(size = 16): string {
	const buffer = new Uint8Array(size)
	crypto.getRandomValues(buffer)
	return ArrayToHex(buffer)
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	let bin = ''
	const uint8 = new Uint8Array(buffer)
	uint8.forEach((code: number) => {
		bin += String.fromCharCode(code)
	})
	return btoa(bin)
}

export function b64ToUrlEncoded(str: string): string {
	return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '')
}

export function urlEncodedToB64(str: string): string {
	const padding = '='.repeat((4 - (str.length % 4)) % 4)
	return str.replace(/-/g, '+').replace(/_/g, '/') + padding
}

export function stringToU8Array(str: string): Uint8Array {
	return new Uint8Array(str.split('').map((c) => c.charCodeAt(0)))
}

export function u8ToString(u8: Uint8Array): string {
	return String.fromCharCode.apply(null, u8 as unknown as number[])
}

export function exportPublicKeyPair<T extends { x: string; y: string }>(key: T): string {
	return btoa('\x04' + atob(urlEncodedToB64(key.x)) + atob(urlEncodedToB64(key.y)))
}

export function joinUint8Arrays(allUint8Arrays: Array<Uint8Array>): Uint8Array {
	return allUint8Arrays.reduce(function (cumulativeValue, nextValue) {
		const joinedArray = new Uint8Array(cumulativeValue.byteLength + nextValue.byteLength)
		joinedArray.set(cumulativeValue, 0)
		joinedArray.set(nextValue, cumulativeValue.byteLength)
		return joinedArray
	}, new Uint8Array())
}

function base64UrlToUint8Array(base64UrlData: string): Uint8Array {
	const base64 = urlEncodedToB64(base64UrlData)
	const rawData = atob(base64)
	return stringToU8Array(rawData)
}

export async function cryptoKeysToUint8Array(
	pubKey: CryptoKey,
	privKey?: CryptoKey
): Promise<{ publicKey: Uint8Array; privateKey?: Uint8Array }> {
	const jwk: any = await crypto.subtle.exportKey('jwk', pubKey)
	const x = base64UrlToUint8Array(jwk.x as string)
	const y = base64UrlToUint8Array(jwk.y as string)
	const publicKey = new Uint8Array(65)
	publicKey.set([0x04], 0)
	publicKey.set(x, 1)
	publicKey.set(y, 33)
	if (privKey) {
		const jwk: any = await crypto.subtle.exportKey('jwk', privKey)
		const privateKey = base64UrlToUint8Array(jwk.d as string)
		return { publicKey, privateKey }
	}
	return { publicKey }
}
