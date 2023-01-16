export type Activity = any

export const PUBLIC_GROUP = 'https://www.w3.org/ns/activitystreams#Public'

// Generate a unique ID. Note that currently the generated URL aren't routable.
export function uri(domain: string): URL {
	const id = crypto.randomUUID()
	return new URL('/ap/a/' + id, 'https://' + domain)
}
