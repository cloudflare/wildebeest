import { parseHandle } from 'wildebeest/backend/src/utils/parse'

function tag(name: string, content: string, attrs: Record<string, string> = {}): string {
	let htmlAttrs = ''
	for (const [key, value] of Object.entries(attrs)) {
		htmlAttrs += ` ${key}="${value}"`
	}

	return `<${name}${htmlAttrs}>${content}</${name}>`
}

const mentionedEmailRegex = /\s@([^@\s]+@[^.\s]+\.[^.\s]+)\s/g
const linkRegex = /\s(https?:\/\/[^.\s]+\.[^.\s]+(?:\/[^.\s/]+)*)\s/g

/// Transform a text status into a HTML status; enriching it with links / mentions.
export function enrichStatus(status: string): string {
	const enrichedStatus = status
		.replace(mentionedEmailRegex, (_, email: string) => ` ${getMentionSpan(email)} `)
		.replace(linkRegex, (_, link: string) => ` ${getLinkAnchor(link)} `)

	return tag('p', enrichedStatus)
}

function getMentionSpan(mentionedEmail: string) {
	const handle = parseHandle(mentionedEmail)

	// TODO: the link to the profile is a guess, we could rely on
	// the cached Actors to find the right link.
	const linkToProfile = `https://${handle.domain}/@${handle.localPart}`

	const mention = `@${tag('span', handle.localPart)}`
	return tag('span', tag('a', mention, { href: linkToProfile, class: 'u-url mention' }), {
		class: 'h-card',
	})
}

function getLinkAnchor(link: string) {
	try {
		const url = new URL(link)

		return tag('a', url.hostname + url.pathname, { href: url.href })
	} catch (err: unknown) {
		console.warn('failed to parse link', err)
		return link
	}
}
