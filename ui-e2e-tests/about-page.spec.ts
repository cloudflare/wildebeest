import { test, expect } from '@playwright/test'

test.skip('Navigation to about page', async () => {
	// TODO: Implement after a navigation has been implemented
})

// To update and unskip when we enable the about page
test.skip('View of the about page', async ({ page }) => {
	await page.goto('http://127.0.0.1:8788/about')

	await expect(page.getByTestId('domain-text')).toHaveText('0.0.0.0')
	await expect(page.getByTestId('social-text')).toHaveText('Decentralised social media powered by Mastodon')

	await expect(page.getByTestId('contact').getByText('Administered by:George 👍@george')).toBeVisible()
	await expect(page.getByTestId('contact').getByText('contact:test@test.com')).toBeVisible()

	await expect(page.getByRole('region').filter({ hasText: 'Please mind that the staff' })).not.toBeVisible()
	await page.getByRole('button', { name: 'About' }).click()
	await expect(page.getByRole('region').filter({ hasText: 'Please mind that the staff' })).toBeVisible()
	await page.getByRole('button', { name: 'About' }).click()
	await expect(page.getByRole('region').filter({ hasText: 'Please mind that the staff' })).not.toBeVisible()

	const getRuleLocator = (ruleId: string) =>
		page.getByRole('listitem').filter({ has: page.getByText(ruleId, { exact: true }) })

	await expect(getRuleLocator('1')).not.toBeVisible()
	await expect(getRuleLocator('2')).not.toBeVisible()
	await expect(getRuleLocator('3')).not.toBeVisible()
	await page.getByRole('button', { name: 'Server rules' }).click()
	await expect(getRuleLocator('1')).toBeVisible()
	await expect(getRuleLocator('1')).toContainText(
		'Sexually explicit or violent media must be marked as sensitive when posting'
	)
	await expect(getRuleLocator('2')).toBeVisible()
	await expect(getRuleLocator('2')).toContainText('No racism, sexism, homophobia, transphobia, xenophobia, or casteism')
	await expect(getRuleLocator('3')).toBeVisible()
	await expect(getRuleLocator('3')).toContainText('No incitement of violence or promotion of violent ideologies')
})
