import { component$, Resource, useResource$ } from '@builder.io/qwik'
import TagDetailsCard from '~/components/TagDetailsCard'
import { tags } from '~/dummyData'
import { TagDetails } from '~/types'

export default component$(() => {
	const resource = useResource$<TagDetails[]>(async () => {
		return tags
	})

	return (
		<Resource
			value={resource}
			onPending={() => <></>}
			onRejected={() => <div>failed</div>}
			onResolved={(tags) => {
				return (
					<div class="mb-4">
						{tags.map((tagDetails) => (
							<div key={tagDetails.name} class="p-4 border-t border-wildebeest-600">
								<TagDetailsCard tagDetails={tagDetails} />
							</div>
						))}
					</div>
				)
			}}
		/>
	)
})
