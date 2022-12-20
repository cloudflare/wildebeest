import { fetch } from 'undici'

describe('Posts timeline page', () => {
	it('should display a list of statuses', async () => {
		const response = await fetch('http://localhost:6868/')
		expect(response.status).toBe(200)
		const body = await response.text()
		expect(body).toContain('This is significant ...')
	})
})
