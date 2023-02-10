import { test, expect } from '@playwright/test'

test('Navigation to and view of an individual toot', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')
	await page.locator('article').filter({ hasText: 'Ken White' }).locator('i.fa-globe + span').click()

	const backButtonLocator = page.getByRole('button', { name: 'Back' })
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

test("Navigation to and view of a toot's replies", async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')

	await page
		.locator('article')
		.filter({ hasText: 'Bethany Black' })
		.filter({
			hasText: 'We did it! *wipes tear from eye*',
		})
		.locator('i.fa-globe + span')
		.click()

	await page
		.locator('article')
		.filter({ hasText: 'Zach Weinersmith' })
		.filter({
			hasText: 'Yes we did!',
		})
		.locator('i.fa-globe + span')
		.click()

	await expect(page.getByRole('link', { name: 'Avatar of Zach Weinersmith' })).toBeVisible()
	await expect(page.getByRole('link', { name: 'Zach Weinersmith', exact: true })).toBeVisible()
	await expect(page.getByText('Yes we did!')).toBeVisible()

	await page.getByRole('button', { name: 'Back' }).click()

	await page
		.locator('article')
		.filter({ hasText: 'nixCraft' })
		.filter({
			hasText: 'Yes you guys did it!',
		})
		.locator('i.fa-globe + span')
		.click()

	await expect(page.getByRole('link', { name: 'Avatar of nixCraft' })).toBeVisible()
	await expect(page.getByRole('link', { name: 'nixCraft 🐧', exact: true })).toBeVisible()
	await expect(page.getByText('Yes you guys did it!')).toBeVisible()
})
