export type MediaType = 'unknown' | 'image' | 'gifv' | 'video' | 'audio'

export type MediaAttachment = {
	id: string
	type: MediaType
	url: URL
	preview_url: URL
	meta: any
	description: string
	blurhash: string
}
