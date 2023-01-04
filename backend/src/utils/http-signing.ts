import { Algorithm, sign } from './http-signing-cavage'
import { str2ab } from './key-ops'

export async function signRequest(request: Request, key: CryptoKey, keyId: URL): Promise<void> {
	const mySigner = async (data: string) =>
		new Uint8Array(
			await crypto.subtle.sign(
				{
					name: 'RSASSA-PKCS1-v1_5',
					hash: 'SHA-256',
				},
				key,
				str2ab(data as string)
			)
		)
	mySigner.alg = 'hs2019' as Algorithm

	if (!request.headers.has('Host')) {
		const url = new URL(request.url)
		request.headers.set('Host', url.host)
	}

	const components = ['@request-target', 'host']
	if (request.method == 'POST') {
		components.push('digest')
	}

	await sign(request, {
		components: components,
		parameters: {
			created: Math.floor(Date.now() / 1000),
		},
		keyId: keyId.toString(),
		signer: mySigner,
	})
}
