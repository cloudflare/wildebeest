import { component$, Resource, useResource$, useStylesScoped$ } from '@builder.io/qwik'
import { mastodonInstance } from '~/dummyData'
import { MastodonInstanceV2 } from '../../../../types'
import styles from './InstanceDetails.scss?inline'

export default component$(() => {
	useStylesScoped$(styles)

	const resource = useResource$<MastodonInstanceV2>(async () => {
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
							<div class="flex">
								<div class="mr-3">
									<h3 class="text-uppercase text-slate-400 text-sm">Administrator:</h3>
									<div class="flex">
										<img class="account-avatar mr-3" src={instance.contact.account.avatar} />
										<div>
											<div class="bold admin-name">
												<a href={instance.contact.account.url}>{instance.contact.account.display_name}</a>
											</div>
											<div class="secondary ellipsis">@{instance.contact.account.acct}</div>
										</div>
									</div>
								</div>
								<div>
									<h3 class="text-uppercase text-slate-400 text-sm">Server Stats:</h3>
									<div class="server-stats">
										<div class="bold">{(instance.usage.users.active_month / 1000).toFixed(0)}K</div>
										<div class="secondary bold">active users</div>
									</div>
								</div>
							</div>
							<a class="no-decoration block mt-4" href={`https://${instance.domain}/about`}>
								<div class="text-md text-semi text-slate-400 border border-slate-400 text-center p3 rounded">
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
