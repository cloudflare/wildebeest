import { test, expect } from '@playwright/test'

const navigationVias = ['time link', 'toot content'] as const

navigationVias.forEach((via) =>
	test(`Navigation to and view of an individual toot via ${via}`, async ({ page }) => {
		await page.goto('http://127.0.0.1:8788/explore')
		if (via === 'time link') {
			await page.locator('article').filter({ hasText: 'Ben, just Ben' }).locator('i.fa-globe + span').click()
		} else {
			await page.getByText('A very simple update: all good!').click()
		}
		await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'Avatar of Ben, just Ben' })).toBeVisible()
		await expect(page.getByTestId('account-display-name').filter({ hasText: 'Ben, just Ben' })).toBeVisible()
		await expect(page.locator('span', { hasText: 'A very simple update: all good!' })).toBeVisible()
	})
)

test('Navigation to and view of an individual toot with images', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')
	await page
		.locator('article')
		.filter({ hasText: "I'm Rafael and I am a web designer!" })
		.locator('i.fa-globe + span')
		.click()
	await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
	await expect(page.getByRole('link', { name: 'Avatar of Raffa123$' })).toBeVisible()
	await expect(page.getByTestId('account-display-name').filter({ hasText: 'Raffa123$' })).toBeVisible()
	await expect(page.locator('p', { hasText: "I'm Rafael and I am a web designer!" })).toBeVisible()
	expect(await page.getByTestId('media-gallery').getByRole('img').count()).toBe(4)
	await expect(page.getByTestId('images-modal')).not.toBeVisible()
	await page.getByTestId('media-gallery').getByRole('img').nth(2).click()
	await expect(page.getByTestId('images-modal')).toBeVisible()
	for (const n of [2, 1, 0, 3, 2, 1, 0, 3]) {
		await expect(page.getByTestId('images-modal').getByRole('img')).toHaveAttribute(
			'src',
			`https://loremflickr.com/640/480/abstract?lock=${100 + n}`
		)
		await page.getByTestId('left-btn').click()
	}
	await page.getByTestId('close-btn').click()
	await expect(page.getByTestId('images-modal')).not.toBeVisible()
})

test("Navigation to and view of a toot's replies", async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')

	await page
		.locator('article')
		.filter({ hasText: 'George' })
		.filter({
			hasText: 'We did it!',
		})
		.locator('i.fa-globe + span')
		.click()

	await page
		.locator('article')
		.filter({ hasText: 'Zak Smith' })
		.filter({
			hasText: 'Yes we did!',
		})
		.locator('i.fa-globe + span')
		.click()

	await expect(page.getByRole('link', { name: 'Avatar of Zak Smith' })).toBeVisible()
	await expect(page.getByTestId('account-display-name').filter({ hasText: 'Zak Smith' })).toBeVisible()
	await expect(page.getByText('Yes we did!')).toBeVisible()

	await page.getByRole('button', { name: 'Back' }).click()

	await page
		.locator('article')
		.filter({ hasText: 'Penny' })
		.filter({
			hasText: 'Yes you guys did it!',
		})
		.locator('i.fa-globe + span')
		.click()

	await expect(page.getByRole('link', { name: 'Avatar of Penny' })).toBeVisible()
	await expect(page.getByTestId('account-display-name').filter({ hasText: 'Penny' })).toBeVisible()
	await expect(page.getByText('Yes you guys did it!')).toBeVisible()
})

test("Correctly hides and displays the toot's content based on the spoiler text", async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')

	await page.getByText('who am I?').click()

	await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()

	const articleLocator = page.getByRole('article').filter({ hasText: 'who am I?' })
	await expect(articleLocator.getByRole('paragraph').getByText('Hi! My name is Rafael! 👋')).not.toBeVisible()
	await articleLocator.getByRole('button', { name: 'show more' }).click()
	await expect(articleLocator.getByRole('paragraph').getByText('Hi! My name is Rafael! 👋')).toBeVisible()
	await articleLocator.getByRole('button', { name: 'show less' }).click()
	await expect(articleLocator.getByRole('paragraph').getByText('Hi! My name is Rafael! 👋')).not.toBeVisible()
})
