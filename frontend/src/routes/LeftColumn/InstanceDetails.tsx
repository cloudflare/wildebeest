import { component$, Resource, useResource$, useStylesScoped$ } from '@builder.io/qwik'
import { mastodonInstance } from '~/dummyData'
import { InstanceDetails } from '~/types'
import styles from './InstanceDetails.scss?inline'

export default component$(() => {
	useStylesScoped$(styles)

	const resource = useResource$<InstanceDetails>(async () => {
		return mastodonInstance
	})

	return (
		<div class="text-sm">
			<p class="text-slate-400">
				<span class="text-semi">wildebeest.info</span> is part of the decentralized social network powered by{' '}
				<a href="https://mastodon.social">Mastodon</a>.
			</p>
			<Resource
				value={resource}
				onPending={() => <div>loading...</div>}
				onRejected={() => <div>failed</div>}
				onResolved={(instance) => {
					return (
						<div>
							<img class="server-thumbnail" src={instance.thumbnail.url} />
							<p>{instance.description}</p>
							<a class="no-decoration block mt-4" href={`https://${instance.domain}/about`}>
								<div class="text-md text-semi text-slate-400 border border-slate-400 text-center p-3 rounded">
									Learn More
								</div>
							</a>
						</div>
					)
				}}
			/>
		</div>
	)
})
