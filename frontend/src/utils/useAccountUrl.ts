import { useSignal, useTask$ } from '@builder.io/qwik'
import { parseHandle } from 'wildebeest/backend/src/utils/parse'
import { Account } from '~/types'
import { useDomain } from './useDomain'

/**
 * Hook to get a url to use for links for the provided account.
 *
 * Note: using account.url is not sufficient since we want to distinguish
 *       between local and remote accounts and change the url accordingly
 *
 * @param account the target account or null
 * @returns url to be used for the target account (or undefined if)
 */
export function useAccountUrl(
	account: (Partial<Pick<Account, 'id'>> & Pick<Account, 'url'>) | null
): string | undefined {
	if (!account?.id) {
		return account?.url
	}

	const isLocal = useAccountIsLocal(account?.id)

	if (account && isLocal.value) {
		const url = new URL(account.url)
		return url.pathname
	}

	return account?.url
}

function useAccountIsLocal(accountId: string | undefined) {
	const domain = useDomain()
	const isLocal = useSignal(false)

	useTask$(({ track }) => {
		track(() => accountId)

		if (accountId) {
			const handle = parseHandle(accountId)
			isLocal.value = handle.domain === null || handle.domain === domain
		}
	})

	return isLocal
}
