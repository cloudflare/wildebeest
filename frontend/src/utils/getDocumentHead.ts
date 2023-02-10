import { DocumentHeadValue } from '@builder.io/qwik-city'

type DocumentHeadData = {
	title?: string
	description?: string
	og?: {
		type?: 'website' | 'article'
		url?: string
		image?: string
	}
}

export function getDocumentHead(data: DocumentHeadData, head?: DocumentHeadValue) {
	const result: DocumentHeadValue = { meta: [] }

	const setMeta = (name: string, content: string) => {
		if (head?.meta?.find((meta) => meta.name === name)) {
			return
		}
		result.meta = result.meta?.filter((meta) => meta.name !== name) ?? []
		result.meta?.push({
			name,
			content,
		})
	}

	if (data.title) {
		result.title = data.title
		setMeta('og:title', data.title)
	}

	if (data.description) {
		setMeta('description', data.description)
		setMeta('og:description', data.description)
	}

	if (data.og) {
		if (data.og.type) {
			setMeta('og:type', data.og.type)
		}
		if (data.og.url) {
			setMeta('og:url', data.og.url)
		}
		if (data.og.image) {
			setMeta('og:image', data.og.image)
		}
	}

	return result
}
