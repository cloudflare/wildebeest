// https://docs.joinmastodon.org/entities/Instance/
export type InstanceConfigV2 = {
	domain: string
	title: string
	version: string
	source_url: string
	description: string
	thumbnail: {
		url: string
	}
	languages: Array<string>
	registrations: {
		enabled: boolean
	}
	contact: {
		email: string
	}
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
