import { component$, useStylesScoped$ } from '@builder.io/qwik'
import styles from './HtmlContent.scss?inline'

export const HtmlContent = component$<{
	html: string
}>(({ html }) => {
	useStylesScoped$(styles)

	return <div class="leading-normal inner-html-content" dangerouslySetInnerHTML={html} />
})
