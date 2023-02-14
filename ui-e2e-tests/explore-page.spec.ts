import { test, expect } from '@playwright/test'

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
