import { test, expect } from '@playwright/test'

test.skip('Navigation to about page', async () => {
	// TODO: Implement after a navigation has been implemented
})

// To update and unskip when we enable the about page
test.skip('View of the about page', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/about')

	await expect(page.getByTestId('domain-text')).toHaveText('0.0.0.0')
	await expect(page.getByTestId('social-text')).toHaveText('Decentralised social media powered by Mastodon')

	// await expect(page.getByTestId('contact').getByText('Administered by: ...')).toBeVisible()
	// await expect(page.getByTestId('contact').getByText('contact: ...')).toBeVisible()

	await expect(page.getByRole('region').filter({ hasText: 'this is a test wildebeest instance!' })).not.toBeVisible()
	await page.getByRole('button', { name: 'About' }).click()
	await expect(page.getByRole('region').filter({ hasText: 'this is a test wildebeest instance!' })).toBeVisible()
	await page.getByRole('button', { name: 'About' }).click()
	await expect(page.getByRole('region').filter({ hasText: 'this is a test wildebeest instance!' })).not.toBeVisible()

	const getRuleLocator = (ruleId: string) =>
		page.getByRole('listitem').filter({ has: page.getByText(ruleId, { exact: true }) })

	await expect(page.getByRole('listitem')).toHaveCount(0)
	await expect(getRuleLocator('1')).not.toBeVisible()
	await expect(getRuleLocator('2')).not.toBeVisible()
	await expect(getRuleLocator('3')).not.toBeVisible()
	await page.getByRole('button', { name: 'Server rules' }).click()
	await expect(page.getByRole('listitem')).toHaveCount(3)
	await expect(getRuleLocator('1')).toBeVisible()
	await expect(getRuleLocator('1')).toContainText("don't be mean")
	await expect(getRuleLocator('2')).toBeVisible()
	await expect(getRuleLocator('2')).toContainText("don't insult people")
	await expect(getRuleLocator('3')).toBeVisible()
	await expect(getRuleLocator('3')).toContainText('respect the rules')
})
