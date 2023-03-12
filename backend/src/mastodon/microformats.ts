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

const linkRegex = /(^|\s|\b)(https?:\/\/[-\w@:%._+~#=]{1,256}\.[a-z]{2,6}\b(?:[-\w@:%_+.~#?&/=]*))(\b|\s|$)/g
const mentionedEmailRegex = /(^|\s|\b|\W)@(\w+(?:[.-]?\w+)+@\w+(?:[.-]?\w+)+(?:\.\w{2,63})+)(\b|\s|$)/g
const tagRegex = /(^|\s|\b|\W)#(\w{2,63})(\b|\s|$)/g

// Transform a text status into a HTML status; enriching it with links / mentions.
export function enrichStatus(status: string, mentions: Array<Actor>): string {
	const anchorsPlaceholdersMap = new Map<string, string>()

	const getLinkAnchorPlaceholder = (link: string) => {
		const anchor = getLinkAnchor(link)
		const placeholder = `%%%___-LINK-PLACEHOLDER-${crypto.randomUUID()}-__%%%`
		anchorsPlaceholdersMap.set(placeholder, anchor)
		return placeholder
	}

	let enrichedStatus = status
		.replace(
			linkRegex,
			(_, matchPrefix: string, link: string, matchSuffix: string) =>
				`${matchPrefix}${getLinkAnchorPlaceholder(link)}${matchSuffix}`
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
		.replace(
			tagRegex,
			(_, matchPrefix: string, tag: string, matchSuffix: string) =>
				`${matchPrefix}${/^\d+$/.test(tag) ? `#${tag}` : getTagAnchor(tag)}${matchSuffix}`
		)

	for (const [placeholder, anchor] of anchorsPlaceholdersMap.entries()) {
		enrichedStatus = enrichedStatus.replace(placeholder, anchor)
	}

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

function getTagAnchor(hashTag: string) {
	try {
		return tag('a', `#${hashTag}`, { href: `/tags/${hashTag.replace(/^#/, '')}`, class: 'status-link hashtag' })
	} catch (err: unknown) {
		console.warn('failed to parse link', err)
		return tag
	}
}
