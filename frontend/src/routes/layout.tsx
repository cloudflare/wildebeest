import { component$, useStylesScoped$, Slot } from '@builder.io/qwik'
import { useLocation } from '@builder.io/qwik-city'
import styles from './layout.scss?inline'
import { LeftColumn } from './LeftColumn/LeftColumn'
import { RightColumn } from './RightColumn/RightColumn'

const pathsWithoutColumns = ['/first-login']

export const useShowColumns = () => {
	const location = useLocation()
	const pathname = new URL(location.href).pathname
	return !pathsWithoutColumns.includes(pathname)
}

export default component$(() => {
	useStylesScoped$(styles)

	const showColumns = useShowColumns()

	return (
		<main class="container">
			{showColumns && (
				<div class="side-column">
					<div class="sticky">
						<LeftColumn />
					</div>
				</div>
			)}
			<div class={`w-full ${showColumns ? 'max-w-lg' : ''}`}>
				<div class={`bg-slate-800 ${showColumns ? 'rounded ' : 'min-h-dscreen'}`}>
					<Slot />
				</div>
			</div>
			{showColumns && (
				<div class="side-column">
					<div class="sticky">
						<RightColumn />
					</div>
				</div>
			)}
		</main>
	)
})
