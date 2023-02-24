import { test, expect } from '@playwright/test'

test('Display the list of toots in the explore page', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')

	const tootsTextsToCheck = [
		'We did it!',
		"I'm Rafael and I am a web designer!",
		"Fine. I'll use Wildebeest",
		'A very simple update: all good!',
	]

	for (const tootText of tootsTextsToCheck) {
		await expect(page.locator('article').filter({ hasText: tootText })).toBeVisible()
	}
})

test('Correctly displays toots with truncated urls', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')

	const articleLocator = page.locator('article').filter({ hasText: "Fine. I'll use Wildebeest" })
	await expect(articleLocator.getByRole('link', { name: 'blog.cloudflare.com/welcome-to…' })).toBeVisible()
})

test('Correctly displays toots with spoiler text', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')

	const articleLocator = page.getByRole('article').filter({ hasText: 'who am I?' })
	await expect(articleLocator.getByRole('paragraph').getByText('Hi! My name is Rafael! 👋')).not.toBeVisible()
	await articleLocator.getByRole('button', { name: 'show more' }).click()
	await expect(articleLocator.getByRole('paragraph').getByText('Hi! My name is Rafael! 👋')).toBeVisible()
	await articleLocator.getByRole('button', { name: 'show less' }).click()
	await expect(articleLocator.getByRole('paragraph').getByText('Hi! My name is Rafael! 👋')).not.toBeVisible()
})
