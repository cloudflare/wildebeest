import { adjustLocalHostDomain } from './adjustLocalHostDomain'

export function getDomain(url: URL | string) {
	const domain = new URL(url).hostname
	return adjustLocalHostDomain(domain)
}
