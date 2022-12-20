import { component$, useStylesScoped$, Slot } from '@builder.io/qwik'
import styles from './layout.scss?inline'
import { LeftColumn } from './LeftColumn/LeftColumn'
import { RightColumn } from './RightColumn/RightColumn'

export default component$(() => {
	useStylesScoped$(styles)

	return (
		<main class="container">
			<div class="side-column">
				<div class="sticky">
					<LeftColumn />
				</div>
			</div>
			<section class="main-content">
				<div class="content-wrapper bg-slate-800 rounded">
					<Slot />
				</div>
			</section>
			<div class="side-column">
				<div class="sticky">
					<RightColumn />
				</div>
			</div>
		</main>
	)
})
