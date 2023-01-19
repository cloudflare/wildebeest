import { fetch } from 'undici'

describe('Posts timeline page', () => {
	it('should display a list of statuses for the home page', async () => {
		const response = await fetch('http://0.0.0.0:6868/')
		expect(response.status).toBe(200)
		const body = await response.text()
		expect(body).toContain('We did it!')
	})

	it('should display a list of statuses for the explore page', async () => {
		const response = await fetch('http://0.0.0.0:6868/explore/')
		expect(response.status).toBe(200)
		const body = await response.text()
		expect(body).toContain('We did it!')
	})
})

describe('Toot details', () => {
	it('should show an individual toot', async () => {
		// Find a specific toot in the list
		const exploreResponse = await fetch('http://0.0.0.0:6868/explore/')
		const exploreBody = await exploreResponse.text()
		const match = exploreBody.match(/href="\/(@BethanyBlack\/[0-9a-z-]*)"/)

		// Fetch the page for it and validate the result
		const tootPath = match?.[1]
		expect(tootPath).toBeTruthy()
		const response = await fetch(`http://0.0.0.0:6868/${tootPath}`)
		expect(response.status).toBe(200)
		const body = await response.text()
		// validate the toot content itself
		expect(body).toContain('We did it!')
		// validate replies
		expect(body).toContain('Yes we did!')
		expect(body).toContain('Yes you guys did it!')
	})
})
