import * as packagejson from '../package.json'

// https://github.com/mastodon/mastodon/blob/main/CHANGELOG.md
export const MASTODON_API_VERSION = '4.0.2'

export const WILDEBEEST_VERSION = packagejson.version

export function getVersion(): string {
	return `${MASTODON_API_VERSION} (compatible; Wildebeest ${WILDEBEEST_VERSION})`
}
