import { test, expect } from '@playwright/test'

test('View of custom emojis in an toots author display name', async ({ page, browserName }) => {
	test.skip(
		true,
		'Qwik does no longer provide a way to mock the q-data request' +
			' so this test needs to be skipped until we either come up with a way to mock the q-data' +
			' or the custom emojis are implemented in the backend'
	)

	// this page.route is a hack to mock the custom emojis since they haven't
	// yet been implemented in the backend (this should be not needed and removed
	// when those are implemented)
	test.skip(
		browserName !== 'chromium',
		"Only chromium seem to test this well, I suspect it's because of the page.route"
	)
	await page.route('http://127.0.0.1:8788/@george/*/q-data.json', async (route) => {
		const response = await route.fetch()
		let body = await response.text()
		body = body.replace(
			/"emojis":\[\]/g,
			`"emojis": ${JSON.stringify([
				{
					shortcode: 'verified',
					url: 'https://files.mastodon.social/cache/custom_emojis/images/000/452/462/original/947cae7ac4dfdfa0.png',
					static_url:
						'https://files.mastodon.social/cache/custom_emojis/images/000/452/462/static/947cae7ac4dfdfa0.png',
					visible_in_picker: true,
				},
			])}`
		)
		await route.fulfill({
			response,
			body,
		})
	})

	await page.goto('http://127.0.0.1:8788/explore')

	await page
		.locator('article')
		.filter({ hasText: 'George' })
		.filter({
			hasText: 'We did it!',
		})
		.locator('i.fa-globe + span')
		.click()

	const customEmojiLocator = page
		.getByRole('link')
		.filter({ hasText: 'George' })
		.getByTestId('account-display-name')
		.getByRole('img')
	await expect(customEmojiLocator).toBeVisible()
	await expect(customEmojiLocator).toHaveAttribute(
		'src',
		'https://files.mastodon.social/cache/custom_emojis/images/000/452/462/original/947cae7ac4dfdfa0.png'
	)
})
