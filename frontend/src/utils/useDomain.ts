import { useLocation } from '@builder.io/qwik-city'
import { adjustLocalHostDomain } from 'wildebeest/backend/src/utils/adjustLocalHostDomain'

export const useDomain = () => {
	const location = useLocation()
	const url = new URL(location.href)
	const domain = url.hostname
	const adjustedDomain = adjustLocalHostDomain(domain)
	return adjustedDomain
}
