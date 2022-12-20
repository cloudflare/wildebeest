import { fetch } from 'undici'

describe('Posts timeline page', () => {
	it('should display a list of statuses', async () => {
		try {
			console.log('127.0.0.1')
			const response = await fetch('http://127.0.0.1:6868/')
			expect(response.status).toBe(200)
			const body = await response.text()
			expect(body).toContain('This is significant ...')
		} catch (e) {
			const error = e as Error
			console.error(error.stack)
		}
		try {
			console.log('0.0.0.0')
			const response = await fetch('http://0.0.0.0:6868/')
			expect(response.status).toBe(200)
			const body = await response.text()
			expect(body).toContain('This is significant ...')
		} catch (e) {
			const error = e as Error
			console.error(error.stack)
		}
	})
})
