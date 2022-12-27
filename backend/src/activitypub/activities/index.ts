export type Activity = any

// Generate a unique ID. Note that currently the generated URL aren't routable.
export function uri(domain: string): URL {
	const id = crypto.randomUUID()
	return new URL('/ap/a/' + id, 'https://' + domain)
}
