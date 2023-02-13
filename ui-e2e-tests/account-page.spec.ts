import { test, expect } from '@playwright/test'
import { getMockStatusFn } from 'wildebeest/ui-e2e-tests-utils/getMockStatusFn'

test('Navigation to and view of an account (with 1 post)', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')
	await page.getByRole('article').getByRole('link', { name: 'Ben, just Ben', exact: true }).click()
	await page.getByRole('link', { name: 'Ben, just Ben', exact: true }).click()
	await page.waitForLoadState('networkidle')
	await page.getByRole('link', { name: 'Ben, just Ben', exact: true }).click()

	await expect(page.getByTestId('account-info').getByRole('img', { name: 'Header of Ben, just Ben' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByRole('img', { name: 'Avatar of Ben, just Ben' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByRole('heading', { name: 'Ben, just Ben' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByText('Joined')).toBeVisible()
	await expect(page.getByTestId('account-info').getByTestId('stats')).toHaveText('1Posts0Following0Followers')

	expect(await page.getByTestId('account-statuses').getByRole('article').count()).toBe(1)
	await expect(
		page.getByTestId('account-statuses').getByRole('article').getByRole('img', { name: 'Avatar of Ben, just Ben' })
	).toBeVisible()
	await expect(page.getByTestId('account-statuses').getByRole('article')).toContainText(
		'A very simple update: all good!'
	)
})

test('Navigation to and view of an account (with 2 posts)', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')
	await page
		.locator('article')
		.filter({ hasText: "I'm Rafael and I am a web designer" })
		.locator('i.fa-globe + span')
		.click()
	await page.waitForLoadState('networkidle')
	await page.getByRole('link', { name: 'Raffa123$', exact: true }).click()

	await expect(page.getByTestId('account-info').getByRole('img', { name: 'Header of Raffa123$' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByRole('img', { name: 'Avatar of Raffa123$' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByRole('heading', { name: 'Raffa123$' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByText('Joined')).toBeVisible()
	await expect(page.getByTestId('account-info').getByTestId('stats')).toHaveText('2Posts0Following0Followers')

	expect(await page.getByTestId('account-statuses').getByRole('article').count()).toBe(2)
	const [post1Locator, post2Locator] = await page.getByTestId('account-statuses').getByRole('article').all()
	await expect(post1Locator.getByRole('img', { name: 'Avatar of Raffa123$' })).toBeVisible()
	await expect(post1Locator).toContainText("I'm Rafael and I am a web designer")
	await expect(post2Locator.getByRole('img', { name: 'Avatar of Raffa123$' })).toBeVisible()
	await expect(post2Locator).toContainText('Hi! My name is Rafael!')
})

test('Fetching of new account toots on scroll (infinite scrolling)', async ({ page, browserName }) => {
	test.skip(browserName !== 'chromium', 'Only chromium tests this well')

	const generateFakeStatus = getMockStatusFn()
	await page.route('http://127.0.0.1:8788/api/v1/accounts/rafa/statuses?*', async (route) => {
		const newStatuses = new Array(5).fill(null).map(generateFakeStatus)
		await route.fulfill({ body: JSON.stringify(newStatuses) })
	})

	await page.goto('http://127.0.0.1:8788/explore')
	await page.locator('article').filter({ hasText: "I'm Rafa, a designer and app" }).locator('i.fa-globe + span').click()
	await page.waitForLoadState('networkidle')
	await page.getByRole('link', { name: 'Rafa', exact: true }).click()
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
