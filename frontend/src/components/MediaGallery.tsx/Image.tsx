import { component$, useStore, $ } from '@builder.io/qwik'
import { MediaAttachment } from '~/types'

type Props = {
	mediaAttachment: MediaAttachment
}

export const focusToObjectFit = (focus: { x: number; y: number }) => {
	const xShift = ((1 - Math.abs(focus.x)) / 2) * 100
	const yShift = ((1 - Math.abs(focus.y)) / 2) * 100

	const x2 = focus.x < 0 ? xShift : 100 - xShift
	const y2 = focus.y > 0 ? yShift : 100 - yShift

	return { x: Math.floor(x2 * 100) / 100, y: Math.floor(y2 * 100) / 100 }
}

export default component$<Props>(({ mediaAttachment }) => {
	const store = useStore({
		isModalOpen: false,
	})

	let objectFit: { x: number; y: number } | undefined
	if (mediaAttachment.meta.focus) {
		objectFit = focusToObjectFit(mediaAttachment.meta.focus)
	}

	const onPreviewClick = $(() => {
		document.body.style.overflowY = 'hidden'
		store.isModalOpen = true
	})

	const onModalClose = $(() => {
		document.body.style.overflowY = 'scroll'
		store.isModalOpen = false
	})

	return (
		<>
			<div class={`${store.isModalOpen ? '' : 'cursor-zoom-in'} w-full h-full`}>
				<img
					class="object-cover w-full h-full rounded"
					style={{
						...(objectFit && { 'object-position': `${objectFit.x}% ${objectFit.y}%` }),
					}}
					src={mediaAttachment.preview_url || mediaAttachment.url}
					onClick$={onPreviewClick}
				/>
				{store.isModalOpen && (
					<div class="relative pointer-events-auto z-50">
						<div class="overlay inset-0 fixed z-60 bg-black opacity-70"></div>
						<div class="fixed z-70 inset-0 grid place-items-center" onClick$={onModalClose}>
							<img src={mediaAttachment.url} />
						</div>
					</div>
				)}
			</div>
		</>
	)
})
