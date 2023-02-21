import { test, expect, Page, Request } from '@playwright/test'
import type { Account, MastodonStatus } from 'wildebeest/frontend/src/types'

test.describe('Infinite (statuses) scrolling', () => {
	const tests = [
		{
			description: 'in explore page',
			goToPageFn: async (page: Page) => await page.goto('http://127.0.0.1:8788/explore'),
			fetchUrl: 'http://127.0.0.1:8788/api/v1/timelines/public?*',
		},
		{
			description: 'in local page',
			goToPageFn: async (page: Page) => await page.goto('http://127.0.0.1:8788/public/local'),
			fetchUrl: 'http://127.0.0.1:8788/api/v1/timelines/public?*',
			isRequestValid: (request: Request) => {
				const searchParams = new URL(request.url()).searchParams
				return searchParams.get('local') === 'true'
			},
		},
		{
			description: 'in federated page',
			goToPageFn: async (page: Page) => await page.goto('http://127.0.0.1:8788/public'),
			fetchUrl: 'http://127.0.0.1:8788/api/v1/timelines/public?*',
		},
		{
			description: 'in account page',
			goToPageFn: async (page: Page) => {
				await page.goto('http://127.0.0.1:8788/explore')
				await page.getByRole('article').getByRole('link').filter({ hasText: 'Raffa123$' }).first().click()
				await expect(page.getByTestId('account-info').getByRole('img', { name: 'Header of Raffa123$' })).toBeVisible()
			},
			fetchUrl: 'http://127.0.0.1:8788/api/v1/accounts/Rafael/statuses?*',
		},
	]

	tests.forEach(({ description, fetchUrl, goToPageFn, isRequestValid }) =>
		test(description, async ({ page, browserName }) => {
			test.skip(browserName !== 'chromium', 'Only chromium tests infinite scrolling well')

			await goToPageFn(page)
			await page.waitForLoadState('networkidle')

			const generateFakeStatus = getMockStatusFn()
			await page.route(fetchUrl, async (route, request) => {
				let newStatuses: MastodonStatus[] = []
				if (!isRequestValid || isRequestValid(request)) {
					newStatuses = new Array(5).fill(null).map(generateFakeStatus)
				}
				await route.fulfill({ body: JSON.stringify(newStatuses) })
			})

			for (let i = 0; i < 3; i++) {
				await page.keyboard.down('End')
				for (let j = 0; j < 5; j++) {
					const paddedJ = `${i * 5 + j}`.padStart(3, '0')
					// check that the new toots have been loaded
					await expect(page.locator('article').filter({ hasText: `Mock Fetched Status #${paddedJ}` })).toBeVisible()
				}
				const paddedExtra = `${i * 5 + 6}`.padStart(3, '0')
				// check that a 6th toot hasn't been loaded (since the mock endpoint returns 5 toots)
				await expect(
					page.locator('article').filter({ hasText: `Mock Fetched Status #${paddedExtra}` })
				).not.toBeVisible()
			}

			const numOfMockFetchedToots = await page.locator('article').filter({ hasText: `Mock Fetched Status` }).count()
			// check that all 15 toots have been loaded
			expect(numOfMockFetchedToots).toBe(15)
		})
	)
})

/**
 * generates a function that creates mock statuses when called,
 * it uses a closure to keep track of the number of generated
 * statuses to that they are consistently enumerated
 * ('Mock Fetched Status #000', 'Mock Fetched Status #001', ...)
 */
export function getMockStatusFn(): () => MastodonStatus {
	let numOfGeneratedMockStatuses = 0
	return () => {
		const paddedNum = `${numOfGeneratedMockStatuses}`.padStart(3, '0')
		const status = {
			content: `Mock Fetched Status #${paddedNum}`,
			account: { display_name: 'test', emojis: [] } as unknown as Account,
			media_attachments: [],
		} as unknown as MastodonStatus
		numOfGeneratedMockStatuses++
		return status
	}
}
