import { parseHandle } from 'wildebeest/backend/src/utils/parse'

function tag(name: string, content: string, attrs: Record<string, string> = {}): string {
	let htmlAttrs = ''
	for (const [key, value] of Object.entries(attrs)) {
		htmlAttrs += ` ${key}="${value}"`
	}

	return `<${name}${htmlAttrs}>${content}</${name}>`
}

function isWhitespace(c: string) {
	return c === '\n' || c === ' ' || c === '\t'
}

/// Transform a text status into a HTML status; enriching it with links / mentions.
export function enrichStatus(status: string): string {
	let out = ''
	let state = 'normal'
	let buffer = ''

	for (let i = 0; true; i++) {
		const char = status[i]
		const eof = char === undefined
		const write = (s: string) => {
			if (s !== undefined) {
				out += s
			}
		}

		if (char === '@') {
			state = 'mention'
		}

		if (status.slice(i, i + 5) === 'http:' || status.slice(i, i + 6) === 'https:') {
			state = 'link'
		}

		if (state === 'link') {
			if (isWhitespace(char) || eof) {
				try {
					const url = new URL(buffer)
					buffer = ''

					write(tag('a', url.hostname + url.pathname, { href: url.href }))
				} catch (err: unknown) {
					console.warn('failed to parse link', err)
					write(buffer)
				}

				state = 'normal'
			} else if (!eof) {
				buffer += char
			}
		}

		if (state === 'mention') {
			if (isWhitespace(char) || eof) {
				try {
					const handle = parseHandle(buffer)

					// TODO: the link to the profile is a guess, we could rely on
					// the cached Actors to find the right link.
					const linkToProfile = `https://${handle.domain}/@${handle.localPart}`

					const mention = '@' + tag('span', handle.localPart)
					write(tag('span', tag('a', mention, { href: linkToProfile, class: 'u-url mention' }), { class: 'h-card' }))
				} catch (err: unknown) {
					console.warn(err)
					write(buffer)
				}

				buffer = ''
				state = 'normal'
			} else if (!eof) {
				buffer += char
			}
		}

		if (state === 'normal') {
			write(char)
		}

		if (eof) {
			break
		}
	}

	return tag('p', out)
}
