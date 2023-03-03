// Naive way of transforming an Actor ObjectID into a handle like WebFinger uses
export function urlToHandle(input: URL): string {
	const { pathname, host } = input
	const parts = pathname.split('/')
	if (parts.length === 0) {
		throw new Error('malformed URL')
	}
	const localPart = parts[parts.length - 1]
	return `${localPart}@${host}`
}

export function isHandle(input: string): boolean {
	const r: RegExp = /^[A-Za-z0-9_]{1,16}(@[A-Za-z0-9]([A-Za-z0-9-]{1,32})?\.[A-Za-z]{2,16})?$/i
	return input.search(r) !== -1
}
