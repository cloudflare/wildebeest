import { test, expect } from '@playwright/test'

test('Navigation to and view of an individual toot', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')
	await page.locator('article').filter({ hasText: 'Ken White' }).locator('i.fa-globe + span').click()

	const backButtonLocator = page.locator('a', { hasText: 'Back' })
	await expect(backButtonLocator).toBeVisible()

	const avatarLocator = page.locator('img[alt="Avatar of Ken White"]')
	await expect(avatarLocator).toBeVisible()

	const userLinkLocator = page.locator('a[href="/@Popehat"]', { hasText: 'Ken White' })
	await expect(userLinkLocator).toBeVisible()

	const tootContentLocator = page.locator('p', {
		hasText: 'Just recorded the first Serious Trouble episode of the new year, out tomorrow.',
	})
	await expect(tootContentLocator).toBeVisible()
})
