import type { InstanceConfig, Rule } from '../types/configs'

const rules: Array<Rule> = [
	{
		id: '1',
		text: 'Sexually explicit or violent media must be marked as sensitive when posting.',
	},
	{
		id: '2',
		text: 'No spam or advertising.',
	},
	{
		id: '3',
		text: 'No racism, sexism, homophobia, transphobia, xenophobia, or casteism.',
	},
	{
		id: '4',
		text: 'No incitement of violence or promotion of violent ideologies.',
	},
	{
		id: '5',
		text: 'No harassment, dogpiling or doxxing of other users.',
	},
	{
		id: '6',
		text: 'No illegal content.',
	},
]

export const instanceConfig: InstanceConfig = {
	// The domain name of the instance
	uri: 'social.eng.chat',

	// The title of the website
	title: 'Mastodon on Workers',

	// An image used to represent this instance
	thumbnail: 'https://jpeg.speedcf.com/cat/19.jpg',

	// Primary languages of the website and its staff
	languages: ['en'],

	// Hints related to contacting a representative of the website.
	// An email address that can be messaged regarding inquiries or issues.
	email: 'admin@social.eng.chat',

	// A short, plain-text description defined by the admin.
	description: 'A general Mastodon server for all languages (expect PHP).',
	// short_description: "...",

	rules,
}
