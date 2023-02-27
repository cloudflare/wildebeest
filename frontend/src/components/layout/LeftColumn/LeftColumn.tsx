import { component$, useContext } from '@builder.io/qwik'
import { InstanceConfigContext } from '~/utils/instanceConfig'
import { useDomain } from '~/utils/useDomain'

export default component$(() => {
	const domain = useDomain()
	const config = useContext(InstanceConfigContext)

	return (
		<div class="hidden xl:block text-sm">
			<p class="text-wildebeest-400">
				<span class="text-semi">{domain}</span>, a decentralized social network forked from{' '}
				<a href="https://github.com/cloudflare/wildebeest">Wildebeest</a>.
			</p>
			<div>
				<img class="w-full" src={config.thumbnail} alt="Society2 instance thumbnail" />
				<p>{config.description}</p>
			</div>
		</div>
	)
})
