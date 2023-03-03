// https://docs.joinmastodon.org/entities/CustomEmoji/
export interface CustomEmoji {
	shortcode: string
	url: string
	static_url: string
	visible_in_picker: boolean
	category: string
}
