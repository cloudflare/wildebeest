import { component$, useStylesScoped$ } from '@builder.io/qwik'
import { MediaAttachment } from '~/types'
import Media from './Media'
import styles from './index.scss?inline'

type Props = {
	medias: MediaAttachment[]
}

export const MediaGallery = component$<Props>(({ medias }) => {
	useStylesScoped$(styles)

	return (
		<>
			{!!medias.length && (
				<div class={`media-gallery overflow-hidden grid gap-1 h-52 md:h-60 lg:h-72 xl:h-80`}>
					{medias.map((media) => (
						<div class="w-full flex items-center justify-center overflow-hidden bg-black">
							<Media mediaAttachment={media} />
						</div>
					))}
				</div>
			)}
		</>
	)
})
