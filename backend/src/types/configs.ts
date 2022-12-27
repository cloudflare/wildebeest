// https://docs.joinmastodon.org/entities/Instance/
export type InstanceConfig = {
	uri: string
	title: string
	languages: Array<string>
	email: string
	description: string
	short_description?: string
	rules: Array<Rule>
}

// https://docs.joinmastodon.org/entities/Rule/
export type Rule = {
	id: string
	text: string
}

export type DefaultImages = {
	avatar: string
	header: string
}
