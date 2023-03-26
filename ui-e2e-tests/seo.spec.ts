import { test, expect, Page } from '@playwright/test'

test.describe('Presence of appropriate SEO metadata across the application', () => {
	test('in explore page', async ({ page }) => {
		await page.goto('http://127.0.0.1:8788/explore')
		await checkPageSeoData(page, {
			title: 'Explore - Wildebeest',
			description: 'My Wildebeest Instance',
			ogType: 'website',
			ogUrl: 'http://127.0.0.1:8788/explore',
			ogImage: 'https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/b24caf12-5230-48c4-0bf7-2f40063bd400/thumbnail',
		})
	})

	test('in local page', async ({ page }) => {
		await page.goto('http://127.0.0.1:8788/public/local')
		await checkPageSeoData(page, {
			title: 'Local timeline - Wildebeest',
			description: 'My Wildebeest Instance',
			ogType: 'website',
			ogUrl: 'http://127.0.0.1:8788/public/local',
			ogImage: 'https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/b24caf12-5230-48c4-0bf7-2f40063bd400/thumbnail',
		})
	})

	test('in public page', async ({ page }) => {
		await page.goto('http://127.0.0.1:8788/public')
		await checkPageSeoData(page, {
			title: 'Federated timeline - Wildebeest',
			description: 'My Wildebeest Instance',
			ogType: 'website',
			ogUrl: 'http://127.0.0.1:8788/public',
			ogImage: 'https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/b24caf12-5230-48c4-0bf7-2f40063bd400/thumbnail',
		})
	})

	test('in toot page', async ({ page }) => {
		await page.goto('http://127.0.0.1:8788/explore')
		await page
			.locator('article')
			.filter({ hasText: "I'm Rafael and I am a web designer!" })
			.locator('i.fa-globe + span')
			.click()
		await checkPageSeoData(page, {
			title: "Raffa123$: I'm Rafael and I am a web desi… - Wildebeest",
			description: "I'm Rafael and I am a web designer! 💪💪",
			ogType: 'article',
			ogUrl: /https:\/\/127.0.0.1\/@Rafael\/[\w-]*\/?/,
			ogImage: 'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/157.jpg',
		})

		await page.goto('http://127.0.0.1:8788/explore')
		await page.locator('article').filter({ hasText: 'Ben, just Ben' }).locator('i.fa-globe + span').click()
		await checkPageSeoData(page, {
			title: 'Ben, just Ben: A very simple update: all good… - Wildebeest',
			description: 'A very simple update: all good!',
			ogType: 'article',
			ogUrl: /https:\/\/127.0.0.1\/@Ben\/[\w-]*\/?/,
			ogImage: 'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/1148.jpg',
		})
	})

	test('in account page', async ({ page }) => {
		await page.goto('http://127.0.0.1:8788/@Ben')
		await checkPageSeoData(page, {
			title: 'Ben, just Ben (@Ben@0.0.0.0) - Wildebeest',
			description: 'Ben, just Ben account page - Wildebeest',
			ogType: 'article',
			ogUrl: 'https://0.0.0.0/@Ben',
			ogImage: 'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/1148.jpg',
		})
	})

	test('in tag page', async ({ page }) => {
		await page.goto('http://127.0.0.1:8788/tags/my-tag')
		await checkPageSeoData(page, {
			title: '#my-tag - Wildebeest',
			description: '#my-tag tag page - Wildebeest',
			ogType: 'website',
			ogUrl: 'http://127.0.0.1:8788/tags/my-tag',
			ogImage: 'https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/b24caf12-5230-48c4-0bf7-2f40063bd400/thumbnail',
		})
	})

	// To unskip when we enable the about page
	test.skip('in about page', async ({ page }) => {
		await page.goto('http://127.0.0.1:8788/about')
		await checkPageSeoData(page, {
			title: 'About - Test Wildebeest',
			description: 'About page for the Test Wildebeest Mastodon instance',
			ogType: 'website',
			ogImage: 'https://imagedelivery.net/NkfPDviynOyTAOI79ar_GQ/b24caf12-5230-48c4-0bf7-2f40063bd400/thumbnail',
		})
	})

	test('in non-existent page', async ({ page }) => {
		await page.goto('http://127.0.0.1:8788/@NonExistent')
		await checkPageSeoData(page, {
			title: 'Wildebeest Not Found',
			description: 'Wildebeest Page Not Found',
			ogType: 'website',
		})
	})
})

type ExpectedSeoValues = {
	title: string | RegExp
	description: string | RegExp
	ogType: 'website' | 'article'
	ogUrl?: string | RegExp
	ogImage?: string | RegExp
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
