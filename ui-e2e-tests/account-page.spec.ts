import { test, expect } from '@playwright/test'

test(`Navigation via to and view of an account (with 1 post)`, async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')
	await page.getByRole('article').getByRole('link').filter({ hasText: 'Ben, just Ben' }).first().click()
	await expect(page.getByTestId('account-info').getByRole('img', { name: 'Header of Ben, just Ben' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByRole('img', { name: 'Avatar of Ben, just Ben' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByRole('heading', { name: 'Ben, just Ben' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByText('Joined')).toBeVisible()
	await expect(page.getByTestId('account-info').getByTestId('stats')).toHaveText('1Posts0Following0Followers')

	expect(await page.getByTestId('account-posts').getByRole('article').count()).toBe(1)
	await expect(
		page.getByTestId('account-posts').getByRole('article').getByRole('img', { name: 'Avatar of Ben, just Ben' })
	).toBeVisible()
	await expect(page.getByTestId('account-posts').getByRole('article')).toContainText('A very simple update: all good!')
})

test('Navigation to and view of an account (with 2 posts)', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/explore')
	await page.getByRole('article').getByRole('link').filter({ hasText: 'Raffa123$' }).first().click()

	await expect(page.getByTestId('account-info').getByRole('img', { name: 'Header of Raffa123$' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByRole('img', { name: 'Avatar of Raffa123$' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByRole('heading', { name: 'Raffa123$' })).toBeVisible()
	await expect(page.getByTestId('account-info').getByText('Joined')).toBeVisible()
	await expect(page.getByTestId('account-info').getByTestId('stats')).toHaveText('2Posts0Following0Followers')

	expect(await page.getByTestId('account-posts').getByRole('article').count()).toBe(2)
	const [post1Locator, post2Locator] = await page.getByTestId('account-posts').getByRole('article').all()
	await expect(post1Locator.getByRole('img', { name: 'Avatar of Raffa123$' })).toBeVisible()
	await expect(post1Locator).toContainText("I'm Rafael and I am a web designer")
	await expect(post2Locator.getByRole('img', { name: 'Avatar of Raffa123$' })).toBeVisible()
	await expect(post2Locator.getByText('who am I?')).toBeVisible()
	await expect(post2Locator.getByRole('paragraph').getByText('Hi! My name is Rafael! 👋')).not.toBeVisible()
	await post2Locator.getByRole('button', { name: 'show more' }).click()
	await expect(post2Locator.getByRole('paragraph').getByText('Hi! My name is Rafael! 👋')).toBeVisible()

	await expect(post2Locator).toContainText('Hi! My name is Rafael!')
})

test('View of an account with only a reply and 0 posts', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/@Penny')

	await expect(page.getByTestId('account-posts')).toBeVisible()
	await expect(page.getByTestId('account-posts')).toHaveText('Nothing to see right now. Check back later!')
	await expect(page.getByTestId('account-posts-and-replies')).not.toBeVisible()

	await page.getByRole('link', { name: 'Posts and replies' }).click()

	await expect(page.getByTestId('account-posts-and-replies')).toBeVisible()
	await expect(page.getByTestId('account-posts-and-replies').getByRole('article')).toContainText('Yes you guys did it!')
	await expect(page.getByTestId('account-posts')).not.toBeVisible()

	await page.getByRole('link', { name: 'Posts', exact: true }).click()

	await expect(page.getByTestId('account-posts')).toBeVisible()
	await expect(page.getByTestId('account-posts')).toHaveText('Nothing to see right now. Check back later!')
	await expect(page.getByTestId('account-posts-and-replies')).not.toBeVisible()
})
