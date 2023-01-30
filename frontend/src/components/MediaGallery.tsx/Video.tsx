import { component$ } from '@builder.io/qwik'
import { MediaAttachment } from '~/types'

type Props = {
	mediaAttachment: MediaAttachment
}

export default component$<Props>(({ mediaAttachment }) => {
	return (
		<div class="h-full">
			<video controls class="object-cover w-full h-full rounded">
				<source src={mediaAttachment.preview_url || mediaAttachment.url} type="video/mp4" />
			</video>
		</div>
	)
})
