import { parseHandle } from 'wildebeest/backend/src/utils/parse'

function tag(name: string, content: string, attrs: Record<string, string> = {}): string {
	let htmlAttrs = ''
	for (const [key, value] of Object.entries(attrs)) {
		htmlAttrs += ` ${key}="${value}"`
	}

	return `<${name}${htmlAttrs}>${content}</${name}>`
}

/// Transform a text status into a HTML status; enriching it with links / mentions.
export function enrichStatus(status: string): string {
	let out = ''
	let state = 'normal'
	let buffer = ''

	for (let i = 0, len = status.length; i < len; i++) {
		const char = status[i]
		if (char === '@') {
			state = 'mention'
		}

		if (status.slice(i, i + 5) === 'http:' || status.slice(i, i + 6) === 'https:') {
			state = 'link'
		}

		if (state === 'link') {
			if (char === ' ') {
				try {
					const url = new URL(buffer)
					buffer = ''

					out += tag('a', url.hostname + url.pathname, { href: url.href })
				} catch (err: unknown) {
					console.warn('failed to parse link', err)
					out += buffer
				}

				out += char
				state = 'normal'
			} else {
				buffer += char
			}
			continue
		}

		if (state === 'mention') {
			if (char === ' ') {
				const handle = parseHandle(buffer)
				buffer = ''

				// TODO: the link to the profile is a guess, we could rely on
				// the cached Actors to find the right link.
				const linkToProfile = `https://${handle.domain}/@${handle.localPart}`

				const mention = '@' + tag('span', handle.localPart)
				out += tag('span', tag('a', mention, { href: linkToProfile, class: 'u-url mention' }), { class: 'h-card' })
				out += char
				state = 'normal'
			} else {
				buffer += char
			}
			continue
		}

		if (state === 'normal') {
			out += char
			continue
		}
	}

	return tag('p', out)
}
