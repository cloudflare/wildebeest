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
	// Loosely based on https://github.com/mastodon/mastodon/blob/aa98c8fbeb02fecac2681464fd7c0445deb466b1/app/models/account.rb#LL65
	// and https://www.regextester.com/103452 but removes the potentially exploitable patterns
	const r: RegExp =
		/^([a-z0-9_]+(?:[a-z0-9_-]+[a-z0-9_]+)?(?:@(?:(?!-)[a-zA-Z0-9-]{0,62}[a-zA-Z0-9]\.)+[a-zA-Z]{2,63})?)$/i
	return input.search(r) !== -1
}
