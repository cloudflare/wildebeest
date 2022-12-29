import type { JWK } from './jwk'
import { WebPushInfos, WebPushMessage, WebPushResult } from './webpushinfos'
import { generateAESGCMEncryptedMessage } from './message'
import { generateV1Headers } from './vapid'

export async function generateWebPushMessage(
	message: WebPushMessage,
	deviceData: WebPushInfos,
	applicationServerKeys: JWK
): Promise<WebPushResult> {
	const [authHeaders, encryptedPayloadDetails] = await Promise.all([
		generateV1Headers(deviceData.endpoint, applicationServerKeys, message.sub),
		generateAESGCMEncryptedMessage(message.data, deviceData),
	])

	const headers: { [headerName: string]: string } = { ...authHeaders }
	headers['Encryption'] = `salt=${encryptedPayloadDetails.salt}`
	headers['Crypto-Key'] = `dh=${encryptedPayloadDetails.publicServerKey};${headers['Crypto-Key']}`

	headers['Content-Encoding'] = 'aesgcm'
	headers['Content-Type'] = 'application/octet-stream'

	// setup message headers
	headers['TTL'] = `${message.ttl}`
	headers['Urgency'] = `${message.urgency}`

	const res = await fetch(deviceData.endpoint, {
		method: 'POST',
		headers,
		body: encryptedPayloadDetails.cipherText,
	})

	switch (res.status) {
		case 200: // http ok
		case 201: // http created
		case 204: // http no content
			return WebPushResult.Success

		case 400: // http bad request
		case 401: // http unauthorized
		case 404: // http not found
		case 410: // http gone
			return WebPushResult.NotSubscribed
	}

	console.warn(`WebPush res: ${res.status} body: ${await res.text()}`)
	return WebPushResult.Error
}
