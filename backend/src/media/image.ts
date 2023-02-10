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

// https://docs.joinmastodon.org/user/profile/#avatar
const AVATAR_VARIANT = 'avatar'

// https://docs.joinmastodon.org/user/profile/#header
const HEADER_VARIANT = 'header'

const USER_CONTENT_VARIANT = 'usercontent'

async function upload(file: File, config: Config): Promise<UploadResult> {
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

	return data.result
}

function selectVariant(res: UploadResult, name: string): URL {
	for (let i = 0, len = res.variants.length; i < len; i++) {
		const variant = res.variants[i]
		if (variant.endsWith(`/${name}`)) {
			return new URL(variant)
		}
	}

	throw new Error(`variant "${name}" not found`)
}

export async function uploadAvatar(file: File, config: Config): Promise<URL> {
	const result = await upload(file, config)
	return selectVariant(result, AVATAR_VARIANT)
}

export async function uploadHeader(file: File, config: Config): Promise<URL> {
	const result = await upload(file, config)
	return selectVariant(result, HEADER_VARIANT)
}

export async function uploadUserContent(request: Request, config: Config): Promise<URL> {
	const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/images/v1`
	const newRequest = new Request(url, request)
	newRequest.headers.set('authorization', 'Bearer ' + config.apiToken)

	const res = await fetch(newRequest)
	if (!res.ok) {
		const body = await res.text()
		throw new Error(`Cloudflare Images returned ${res.status}: ${body}`)
	}

	const data = await res.json<APIResult<UploadResult>>()
	if (!data.success) {
		const body = await res.text()
		throw new Error(`Cloudflare Images returned ${res.status}: ${body}`)
	}

	return selectVariant(data.result, USER_CONTENT_VARIANT)
}
