import { fetch } from 'undici'

describe('Posts timeline page', () => {
	it('should display a list of statuses', async () => {
		console.log('0.0.0.0')
		const response = await fetch('http://0.0.0.0:6868/')
		expect(response.status).toBe(200)
		const body = await response.text()
		expect(body).toContain('There were three men came out of the West')
	})
})
