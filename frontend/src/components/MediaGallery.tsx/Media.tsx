import { component$ } from '@builder.io/qwik'
import Image from './Image'
import Video from './Video'
import { MediaAttachment } from '~/types'

type Props = {
	mediaAttachment: MediaAttachment
}

export default component$<Props>(({ mediaAttachment }) => {
	return (
		<>
			{mediaAttachment.type === 'image' ? <Image mediaAttachment={mediaAttachment} /> : ''}
			{mediaAttachment.type === 'video' ? <Video mediaAttachment={mediaAttachment} /> : ''}
		</>
	)
})
