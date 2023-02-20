import { useLocation } from '@builder.io/qwik-city'
import { getDomain } from 'wildebeest/backend/src/utils/getDomain'

export const useDomain = () => {
	const location = useLocation()
	return getDomain(location.url)
}
