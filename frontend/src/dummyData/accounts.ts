import { type Account } from '~/types'
import { getRandomDateInThePastYear } from './getRandomDateInThePastYear'

export const george = generateDummyAccount({
	username: 'george',
	acct: 'george_george@dummy.users.wildebeest.com',
	display_name: 'George :verified: 👍',
	avatar: getAvatarUrl(837),
	avatar_static: getAvatarUrl(837),
})

export const zak = generateDummyAccount({
	username: 'ZakSmith',
	acct: 'ZakSmith',
	display_name: 'Zak Smith',
	avatar: getAvatarUrl(75),
	avatar_static: getAvatarUrl(75),
})

export const penny = generateDummyAccount({
	username: 'Penny',
	acct: 'Penny',
	display_name: 'Penny',
	avatar: getAvatarUrl(140),
	avatar_static: getAvatarUrl(140),
})

export const ben = generateDummyAccount({
	username: 'Ben',
	acct: 'ben',
	display_name: 'Ben, just Ben',
	avatar: getAvatarUrl(1148),
	avatar_static: getAvatarUrl(1148),
})

export const rafael = generateDummyAccount({
	username: 'Rafael',
	acct: 'raffa',
	display_name: 'Raffa123$',
	avatar: getAvatarUrl(157),
	avatar_static: getAvatarUrl(309),
})

function generateDummyAccount(
	details: Pick<Account, 'username' | 'acct' | 'display_name' | 'avatar' | 'avatar_static'>
): Account {
	return {
		...details,
		id: `${Math.round(Math.random() * 9999999)}`.padStart(7, '0'),
		locked: false,
		bot: false,
		discoverable: true,
		group: false,
		created_at: getRandomDateInThePastYear().toISOString(),
		note: '<p>A simple note!</p>',
		url: `https://dummay.users.wildebeest.com/@${details.username}`,
		header: getRandomHeaderUrl(),
		header_static: getRandomHeaderUrl(),
		followers_count: Math.round(Math.random() * 100),
		following_count: Math.round(Math.random() * 100),
		statuses_count: Math.round(Math.random() * 100),
		last_status_at: getLastStatusAt(),
		emojis: [
			{
				shortcode: 'verified',
				url: 'https://files.mastodon.social/cache/custom_emojis/images/000/452/462/original/947cae7ac4dfdfa0.png',
				static_url: 'https://files.mastodon.social/cache/custom_emojis/images/000/452/462/static/947cae7ac4dfdfa0.png',
				visible_in_picker: true,
			},
		],
		fields: [
			{
				name: 'Instagram',
				value:
					'<a href="https://www.instagram.com/" rel="nofollow noopener noreferrer" target="_blank"><span class="invisible">https://www.</span><span class="">instagram.com</span><span class="invisible"></span></a>',
				verified_at: null,
			},
			{
				name: 'Twitter',
				value:
					'<a href="https://twitter.com/" rel="nofollow noopener noreferrer" target="_blank"><span class="invisible">https://</span><span class="">twitter.com</span><span class="invisible"></span></a>',
				verified_at: null,
			},
			{
				name: 'Facebook',
				value:
					'<a href="https://www.facebook.com/" rel="nofollow noopener noreferrer" target="_blank"><span class="invisible">https://www.</span><span class="">facebook.com</span><span class="invisible"></span></a>',
				verified_at: null,
			},
		],
	}
}

// the number should be between 0 and 1249
function getAvatarUrl(number: number) {
	return `https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/${number}.jpg`
}

function getRandomHeaderUrl() {
	return `https:/loremflickr.com/640/480/wildebeest?lock=${Math.round(Math.random() * 999999)}`
}

function getLastStatusAt() {
	const date = getRandomDateInThePastYear()
	return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}
