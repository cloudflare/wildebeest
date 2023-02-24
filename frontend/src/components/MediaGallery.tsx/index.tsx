import { component$, useStylesScoped$, $, useStore } from '@builder.io/qwik'
import { MediaAttachment } from '~/types'
import Image from './Image'
import Video from './Video'
import styles from './index.scss?inline'
import { ImagesModal } from './ImagesModal'

type Props = {
	medias: MediaAttachment[]
}

export const MediaGallery = component$<Props>(({ medias }) => {
	useStylesScoped$(styles)

	const images = medias.filter((media) => media.type === 'image')

	const imagesModalState = useStore<{ isOpen: boolean; idxOfCurrentImage: number }>({
		isOpen: false,
		idxOfCurrentImage: 0,
	})

	const onOpenImagesModal = $((imgId: string) => {
		document.body.style.overflowY = 'hidden'
		imagesModalState.isOpen = true
		const idx = images.findIndex(({ id }) => id === imgId)
		imagesModalState.idxOfCurrentImage = idx === -1 ? 0 : idx
	})

	const onCloseImagesModal = $(() => {
		document.body.style.overflowY = 'scroll'
		imagesModalState.isOpen = false
	})

	return (
		<>
			{!!medias.length && (
				<div
					data-testid="media-gallery"
					class={`media-gallery overflow-hidden grid gap-1 h-52 md:h-60 lg:h-72 xl:h-80`}
				>
					{medias.map((media) => (
						<div class="w-full flex items-center justify-center overflow-hidden bg-black">
							{media.type === 'image' && <Image mediaAttachment={media} onOpenImagesModal$={onOpenImagesModal} />}
							{media.type === 'video' && <Video mediaAttachment={media} />}
						</div>
					))}
				</div>
			)}
			{imagesModalState.isOpen && (
				<ImagesModal
					images={images}
					idxOfCurrentImage={imagesModalState.idxOfCurrentImage}
					onCloseImagesModal$={onCloseImagesModal}
				/>
			)}
		</>
	)
})
