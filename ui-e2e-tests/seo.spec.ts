import { test, expect, Page } from '@playwright/test'

test('Presence of appropriate SEO metadata across the application', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')
	await checkPageSeoData(page, {
		title: 'Explore - Wildebeest',
		description: 'My Wildebeest Instance',
		ogType: 'website',
		ogUrl: 'http://127.0.0.1:8788/explore',
		ogImage: 'https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/b24caf12-5230-48c4-0bf7-2f40063bd400/thumbnail',
	})

	await page.goto('http://127.0.0.1:8788/public/local')
	await checkPageSeoData(page, {
		title: 'Local timeline - Wildebeest',
		description: 'My Wildebeest Instance',
		ogType: 'website',
		ogUrl: 'http://127.0.0.1:8788/public/local',
		ogImage: 'https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/b24caf12-5230-48c4-0bf7-2f40063bd400/thumbnail',
	})

	await page.goto('http://127.0.0.1:8788/public')
	await checkPageSeoData(page, {
		title: 'Federated timeline - Wildebeest',
		description: 'My Wildebeest Instance',
		ogType: 'website',
		ogUrl: 'http://127.0.0.1:8788/public',
		ogImage: 'https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/b24caf12-5230-48c4-0bf7-2f40063bd400/thumbnail',
	})

	await page.goto('http://127.0.0.1:8788/explore')
	await page.locator('article').filter({ hasText: 'Hi, meet HiDock' }).locator('i.fa-globe + span').click()
	await checkPageSeoData(page, {
		title: "Rafa: Hi, meet HiDock! It's a free M… - Wildebeest",
		description:
			"Hi, meet HiDock! It's a free Mac app that lets you set different Dock settings for different display configurations https://hidock.app →",
		ogType: 'article',
		ogUrl: /https:\/\/127.0.0.1\/statuses\/[\w-]*\/?/,
		ogImage: 'https://cdn.masto.host/mastodondesign/accounts/avatars/000/011/932/original/8f601be03c98b2e8.png',
	})

	await page.goto('http://127.0.0.1:8788/@rafa')
	await checkPageSeoData(page, {
		title: 'Rafa (@rafa@0.0.0.0) - Wildebeest',
		description: 'Rafa account page - Wildebeest',
		ogType: 'article',
		ogUrl: 'https://0.0.0.0/@rafa',
		ogImage: 'https://cdn.masto.host/mastodondesign/accounts/avatars/000/011/932/original/8f601be03c98b2e8.png',
	})

	await page.goto('http://127.0.0.1:8788/explore')
	await page.locator('article').filter({ hasText: 'Ken White' }).locator('i.fa-globe + span').click()
	await checkPageSeoData(page, {
		title: 'Ken White: Just recorded the first Seriou… - Wildebeest',
		description:
			'Just recorded the first Serious Trouble episode of the new year, out tomorrow.  This week:  George Santos is in serious trouble.  Sam Bankman-Fried is in REALLY serious trouble.  And Scott Adams is still making dumb defamation threats.',
		ogType: 'article',
		ogUrl: /https:\/\/127.0.0.1\/statuses\/[\w-]*\/?/,
		ogImage: 'https://files.mastodon.social/accounts/avatars/109/502/260/753/916/593/original/f721da0f38083abf.jpg',
	})

	await page.goto('http://127.0.0.1:8788/@Popehat')
	await checkPageSeoData(page, {
		title: 'Ken White (@Popehat@0.0.0.0) - Wildebeest',
		description: 'Ken White account page - Wildebeest',
		ogType: 'article',
		ogUrl: 'https://0.0.0.0/@Popehat',
		ogImage: 'https://files.mastodon.social/accounts/avatars/109/502/260/753/916/593/original/f721da0f38083abf.jpg',
	})
})

type ExpectedSeoValues = {
	title: string | RegExp
	description: string | RegExp
	ogType: 'website' | 'article'
	ogUrl: string | RegExp
	ogImage: string | RegExp
}

async function checkPageSeoData(page: Page, expected: Partial<ExpectedSeoValues>) {
	const metaLocator = (name: string) => page.locator(`meta[name="${name}"]`)

	expected.title && (await expect(page).toHaveTitle(expected.title))
	expected.title && (await expect(metaLocator('og:title')).toHaveAttribute('content', expected.title))
	expected.description && (await expect(metaLocator('description')).toHaveAttribute('content', expected.description))
	expected.description && (await expect(metaLocator('og:description')).toHaveAttribute('content', expected.description))
	expected.ogType && (await expect(metaLocator('og:type')).toHaveAttribute('content', expected.ogType))
	expected.ogUrl && (await expect(metaLocator('og:url')).toHaveAttribute('content', expected.ogUrl))
	expected.ogImage && (await expect(metaLocator('og:image')).toHaveAttribute('content', expected.ogImage))
}
