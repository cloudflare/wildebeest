export type Activity = any
import { instanceConfig } from 'wildebeest/config/instance'

// Generate a unique ID. Note that currently the generated URL aren't routable.
export function uri(): URL {
	const id = crypto.randomUUID()
	return new URL('/ap/a/' + id, 'https://' + instanceConfig.uri)
}
