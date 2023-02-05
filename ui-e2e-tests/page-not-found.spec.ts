import { test, expect, type Page } from '@playwright/test'

async function test404Page(page: Page, url: string) {
	const response = await page.goto(url)
	expect(response?.status()).toEqual(404)
	const NotFoundTextLocator = page.getByText("The page you are looking for isn't here.")
	await expect(NotFoundTextLocator).toBeVisible()
}

test('Trying to access a non existent page should result in a 404 page', async ({ page }) => {
	await test404Page(page, 'http://127.0.0.1:8788/gibberish_fytr75235dfhhlplo')
})

test('Trying to access a non existent sub-page should result in a 404 page', async ({ page }) => {
	await test404Page(page, 'http://127.0.0.1:8788/explore/gibberish_fytr75235dfhhlplo')
})

test('Trying to access a non existent sub-sub-page should result in a 404 page', async ({ page }) => {
	await test404Page(page, 'http://127.0.0.1:8788/explore/gibberish/fytr75235dfhhlplo')
})
