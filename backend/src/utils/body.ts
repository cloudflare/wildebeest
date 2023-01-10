// Extract the request body as the type `T`. Use this function when the requset
// can be url encoded, form data or JSON. However, not working for formData
// containing binary data (like File).
export async function readBody<T>(request: Request): Promise<T> {
	const contentType = request.headers.get('content-type')
	if (contentType === null) {
		throw new Error('invalid request')
	}
	if (contentType.startsWith('application/json')) {
		return request.json<T>()
	} else {
		const form = await request.formData()
		let out: any = {}

		for (const [key, value] of form) {
			out[key] = value
		}
		return out as T
	}
}
