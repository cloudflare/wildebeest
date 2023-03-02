export type Handle = {
	localPart: string
	domain: string | null
}

// Parse a "handle" in the form: `[@] <local-part> '@' <domain>`
export function parseHandle(query: string): Handle {
	// Remove the leading @, if there's one.
	if (query.startsWith('@')) {
		query = query.substring(1)
	}

	// In case the handle has been URL encoded
	query = decodeURIComponent(query)

	const parts = query.split('@')
	if (parts.length > 0) {
		const localPart = parts[0]

		if (!/^[\w-.]+$/.test(localPart)) {
			throw new Error('invalid handle: localPart: ' + localPart)
		}

		if (parts.length > 1) {
			return { localPart, domain: parts[1] }
		} else {
			return { localPart, domain: null }
		}
	} else {
		// it's a URI handle?
		const urlParts = query.replace(/^https?:\/\//, '').split('/')
		return { domain: urlParts[0], localPart: urlParts[urlParts.length - 1] }
	}
}
