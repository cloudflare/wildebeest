export type Config = {
	accountId: string
	apiToken: string
}

type APIResult<T> = {
	success: boolean
	errors: Array<any>
	messages: Array<any>
	result: T
}

type UploadResult = {
	id: string
	filename: string
	metadata: object
	requireSignedURLs: boolean
	variants: Array<string>
	uploaded: string
}

export async function uploadImage(file: File, config: Config): Promise<URL> {
	const formData = new FormData()
	const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/images/v1`

	formData.set('file', file)

	const res = await fetch(url, {
		method: 'POST',
		body: formData,
		headers: {
			authorization: 'Bearer ' + config.apiToken,
		},
	})
	if (!res.ok) {
		const body = await res.text()
		throw new Error(`Cloudflare Images returned ${res.status}: ${body}`)
	}

	const data = await res.json<APIResult<UploadResult>>()
	if (!data.success) {
		const body = await res.text()
		throw new Error(`Cloudflare Images returned ${res.status}: ${body}`)
	}

	// We assume there's only one variant for now.
	const variant = data.result.variants[0]
	return new URL(variant)
}
