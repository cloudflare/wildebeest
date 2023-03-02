import { component$, useContext } from '@builder.io/qwik'
import { Link } from '@builder.io/qwik-city'
import { InstanceConfigContext } from '~/utils/instanceConfig'
import { useDomain } from '~/utils/useDomain'

export default component$(() => {
	const domain = useDomain()
	const config = useContext(InstanceConfigContext)

	return (
		<div class="hidden xl:block text-sm">
			<p class="text-wildebeest-400">
				<span class="text-semi">{domain}</span> is part of the decentralized social network powered by{' '}
				<a href="https://github.com/cloudflare/wildebeest">Wildebeest</a>.
			</p>
			<div>
				<img class="w-full" src={config.thumbnail} alt="Wildebeest instance thumbnail" />
				<p>{config.description}</p>
			</div>
			<Link
				class="block text-wildebeest-500 border border-current my-4 p-2 text-center rounded-md no-underline"
				href="/about"
			>
				Learn More
			</Link>
		</div>
	)
})
