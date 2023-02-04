import { test, expect } from '@playwright/test'

test('Display the list of toots in the explore page', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')

	const tootsTextsToCheck = [
		'Hi, meet HiDock',
		'George Santos is in serious trouble.',
		'The real message of Jurassic Park is that you get the Unix and IT support you pay for.',
		'BREAKING: Black smoke coming from Capitol chimney.',
	]

	for (const tootText of tootsTextsToCheck) {
		await expect(page.locator('article').filter({ hasText: tootText })).toBeVisible()
	}
})
