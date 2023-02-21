import { component$, useSignal, PropFunction } from '@builder.io/qwik'
import { MediaAttachment } from '~/types'

type Props = {
	images: MediaAttachment[]
	idxOfCurrentImage: number
	onCloseImagesModal$: PropFunction<() => void>
}

export const ImagesModal = component$<Props>(({ images, idxOfCurrentImage: initialIdx, onCloseImagesModal$ }) => {
	const idxOfCurrentImage = useSignal(initialIdx)

	return (
		<div
			data-testid="images-modal"
			class="pointer-events-auto cursor-default z-50 fixed inset-0 isolate flex items-center justify-between backdrop-blur-sm"
		>
			<div class="inset-0 absolute z-[-1] bg-wildebeest-900 opacity-70" onClick$={() => onCloseImagesModal$()}></div>
			{images.length > 1 && (
				<button
					data-testid="left-btn"
					class="cursor-pointer text-4xl opacity-60 hover:opacity-90 focus-visible:opacity-90"
					onClick$={() => {
						const idx = idxOfCurrentImage.value - 1
						idxOfCurrentImage.value = idx < 0 ? images.length - 1 : idx
					}}
				>
					<i class="fa-solid fa-chevron-left ml-5"></i>
				</button>
			)}
			<img class="ma max-w-[80vw] max-h-[90vh] m-auto" src={images[idxOfCurrentImage.value].url} />
			{images.length > 1 && (
				<button
					data-testid="right-btn"
					class="cursor-pointer text-4xl opacity-60 hover:opacity-90 focus-visible:opacity-90"
					onClick$={() => {
						idxOfCurrentImage.value = (idxOfCurrentImage.value + 1) % images.length
					}}
				>
					<i class="fa-solid fa-chevron-right mr-5"></i>
				</button>
			)}
			<button
				data-testid="close-btn"
				class="cursor-pointer absolute top-7 right-7 text-4xl opacity-60 hover:opacity-90 focus-visible:opacity-90"
				onClick$={() => onCloseImagesModal$()}
			>
				<i class="fa-solid fa-xmark"></i>
			</button>
		</div>
	)
})
