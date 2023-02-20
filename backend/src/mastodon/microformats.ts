import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import type { Actor } from 'wildebeest/backend/src/activitypub/actors'
import { urlToHandle } from 'wildebeest/backend/src/utils/handle'

function tag(name: string, content: string, attrs: Record<string, string> = {}): string {
	let htmlAttrs = ''
	for (const [key, value] of Object.entries(attrs)) {
		htmlAttrs += ` ${key}="${value}"`
	}

	return `<${name}${htmlAttrs}>${content}</${name}>`
}

const linkRegex = /(^|\s|\b)(https?:\/\/[-\w@:%._+~#=]{2,256}\.[a-z]{2,6}\b(?:[-\w@:%_+.~#?&/=]*))(\b|\s|$)/g
const mentionedEmailRegex = /(^|\s|\b|\W)@(\w+(?:[.-]?\w+)+@\w+(?:[.-]?\w+)+(?:\.\w{2,63})+)(\b|\s|$)/g

/// Transform a text status into a HTML status; enriching it with links / mentions.
export function enrichStatus(status: string, mentions: Array<Actor>): string {
	const enrichedStatus = status
		.replace(
			linkRegex,
			(_, matchPrefix: string, link: string, matchSuffix: string) =>
				`${matchPrefix}${getLinkAnchor(link)}${matchSuffix}`
		)
		.replace(mentionedEmailRegex, (_, matchPrefix: string, email: string, matchSuffix: string) => {
			// ensure that the match is part of the mentions array
			for (let i = 0, len = mentions.length; i < len; i++) {
				if (email === urlToHandle(mentions[i].id)) {
					return `${matchPrefix}${getMentionSpan(email)}${matchSuffix}`
				}
			}

			// otherwise the match isn't valid and we don't add HTML
			return `${matchPrefix}${email}${matchSuffix}`
		})

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

		return tag('a', url.hostname + url.pathname, { href: link })
	} catch (err: unknown) {
		console.warn('failed to parse link', err)
		return link
	}
}
