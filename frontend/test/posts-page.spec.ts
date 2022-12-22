import { fetch } from 'undici'

describe('Posts timeline page', () => {
	it('should display a list of statuses', async () => {
		const response = await fetch('http://0.0.0.0:6868/explore/')
		expect(response.status).toBe(200)
		const body = await response.text()
		expect(body).toContain('It is that time of the year. The Wreath of Khan.')
	})
})
