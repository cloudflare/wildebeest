import { fetch } from 'undici'

describe('Posts timeline page', () => {
	it('should display a list of statuses for the home page', async () => {
		const response = await fetch('http://0.0.0.0:6868/')
		expect(response.status).toBe(200)
		const body = await response.text()
		expect(body).toContain("I'll be House Speaker")
	})

	it('should display a list of statuses for the explore page', async () => {
		const response = await fetch('http://0.0.0.0:6868/explore/')
		expect(response.status).toBe(200)
		const body = await response.text()
		expect(body).toContain("I'll be House Speaker")
	})
})
