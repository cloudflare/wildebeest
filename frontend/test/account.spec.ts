import { fetch } from 'undici'

describe('Account page', () => {
	it('should display the basic information of an account', async () => {
		const response = await fetch(`http://0.0.0.0:6868/@BethanyBlack`)
		expect(response.status).toBe(200)
		const body = await response.text()
		expect(body).toMatch(/<img [^<>]*alt="Avatar of Bethany Black"[^<>]*>/)
		expect(body).toMatch(/<h2 [^<>]*>Bethany Black<\/h2>/)
		expect(body).toMatch(
			/<div [^<>]*><dt [^<>]*>Joined<\/dt>[^<>]*<dd [^<>]*>[A-Z][a-z]{2} \d{1,2}, \d{4}<\/dd>[^<>]*<\/div>/
		)

		expect(body).toMatch(
			/<div [^<>]*><dt [^<>]*>Joined<\/dt>[^<>]*<dd [^<>]*>[A-Z][a-z]{2} \d{1,2}, \d{4}<\/dd>[^<>]*<\/div>/
		)

		const stats = [
			{ name: 'Posts', value: 1 },
			{ name: 'Posts', value: 1 },
			{ name: 'Following', value: 0 },
			{ name: 'Followers', value: 0 },
		]

		stats.forEach(({ name, value }) => {
			const regex = new RegExp(`<span [^<>]*>${value}</span>[^<>]*<span [^<>]*>${name}</span>`)
			expect(body).toMatch(regex)
		})
	})
})
