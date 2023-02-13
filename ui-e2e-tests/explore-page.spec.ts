import { test, expect } from '@playwright/test'
import { getMockStatusFn } from 'wildebeest/ui-e2e-tests-utils/getMockStatusFn'

test('Display the list of toots in the explore page', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')

	const tootsTextsToCheck = [
		'Hi! My name is Rafael!',
		'We did it!',
		"Fine. I'll use Wildebeest",
		'A very simple update: all good!',
	]

	for (const tootText of tootsTextsToCheck) {
		await expect(page.locator('article').filter({ hasText: tootText })).toBeVisible()
	}
})

test('Fetching of new toots on scroll (infinite scrolling)', async ({ page, browserName }) => {
	test.skip(browserName !== 'chromium', 'Only chromium tests this well')

	const generateFakeStatus = getMockStatusFn()
	await page.route('http://127.0.0.1:8788/api/v1/timelines/public?*', async (route) => {
		const newStatuses = new Array(5).fill(null).map(generateFakeStatus)
		await route.fulfill({ body: JSON.stringify(newStatuses) })
	})

	await page.goto('http://127.0.0.1:8788/explore')
	await page.waitForLoadState('networkidle')

	for (let i = 0; i < 3; i++) {
		await page.keyboard.down('End')
		for (let j = 0; j < 5; j++) {
			const paddedJ = `${i * 5 + j}`.padStart(3, '0')
			// check that the new toots have been loaded
			await expect(page.locator('article').filter({ hasText: `Mock Fetched Status #${paddedJ}` })).toBeVisible()
		}
		const paddedExtra = `${i * 5 + 6}`.padStart(3, '0')
		// check that a 6th toot hasn't been loaded (since the mock endpoint returns 5 toots)
		await expect(page.locator('article').filter({ hasText: `Mock Fetched Status #${paddedExtra}` })).not.toBeVisible()
	}

	const numOfMockFetchedToots = await page.locator('article').filter({ hasText: `Mock Fetched Status` }).count()
	// check that all 15 toots have been loaded
	expect(numOfMockFetchedToots).toBe(15)
})
