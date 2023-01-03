import { useLocation } from '@builder.io/qwik-city'

export const useDomain = () => {
	const location = useLocation()
	const url = new URL(location.href)
	const domain = url.hostname
	return domain
}
