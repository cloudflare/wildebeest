/**
 * checks if a domain is a localhost one ('localhost' or '127.x.x.x') and
 * in that case replaces it with '0.0.0.0' (which is what we use for our local data)
 *
 * Note: only needed for local development
 *
 * @param domain the potentially localhost domain
 * @returns the adjusted domain if it was a localhost one, the original domain otherwise
 */
export function adjustLocalHostDomain(domain: string) {
	return domain.replace(/^localhost$|^127(\.(?:\d){1,3}){3}$/, '0.0.0.0')
}
