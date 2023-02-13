import { test, expect } from '@playwright/test'

test('Navigation to and view of an account (with 1 post)', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')
	await page.getByRole('article').getByRole('link', { name: 'Ben Rosengart', exact: true }).click()
	await page.getByRole('link', { name: 'Ben Rosengart', exact: true }).click()
	await page.waitForLoadState('networkidle')
	await page.getByRole('link', { name: 'Ben Rosengart', exact: true }).click()

	await expect(page.getByTestId('account-info').getByRole('img', { name: 'Header of Ben Rosengart' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByRole('img', { name: 'Avatar of Ben Rosengart' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByRole('heading', { name: 'Ben Rosengart' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByText('Joined')).toBeVisible()
	await expect(page.getByTestId('account-info').getByTestId('stats')).toHaveText('1Posts0Following0Followers')

	expect(await page.getByTestId('account-statuses').getByRole('article').count()).toBe(1)
	await expect(
		page.getByTestId('account-statuses').getByRole('article').getByRole('img', { name: 'Avatar of Ben Rosengart' })
	).toBeVisible()
	await expect(page.getByTestId('account-statuses').getByRole('article')).toContainText('What fresh hell is this?')
})

test('Navigation to and view of an account (with 2 posts)', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')
	await page.locator('article').filter({ hasText: "I'm Rafa, a designer and app" }).locator('i.fa-globe + span').click()
	await page.waitForLoadState('networkidle')
	await page.getByRole('link', { name: 'Rafa', exact: true }).click()

	await expect(page.getByTestId('account-info').getByRole('img', { name: 'Header of Rafa' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByRole('img', { name: 'Avatar of Rafa' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByRole('heading', { name: 'Rafa' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByText('Joined')).toBeVisible()
	await expect(page.getByTestId('account-info').getByTestId('stats')).toHaveText('2Posts0Following0Followers')

	expect(await page.getByTestId('account-statuses').getByRole('article').count()).toBe(2)
	const [post1Locator, post2Locator] = await page.getByTestId('account-statuses').getByRole('article').all()
	await expect(post1Locator.getByRole('img', { name: 'Avatar of Rafa' })).toBeVisible()
	await expect(post1Locator).toContainText("I'm Rafa, a designer and app developer currently living in Amsterdam")
	await expect(post2Locator.getByRole('img', { name: 'Avatar of Rafa' })).toBeVisible()
	await expect(post2Locator).toContainText('Hi, meet HiDock!')
})
