import { component$ } from '@builder.io/qwik'
import { loader$ } from '@builder.io/qwik-city'
import { getNotFoundHtml } from '~/utils/getNotFoundHtml/getNotFoundHtml'

export const loader = loader$(({ html }) => {
	html(404, getNotFoundHtml())
})

export default component$(() => {
	loader()
	return <></>
})
