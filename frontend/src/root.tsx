import { component$, useStyles$ } from '@builder.io/qwik'
import { QwikCityProvider, RouterOutlet, ServiceWorkerRegister } from '@builder.io/qwik-city'
import { RouterHead } from './components/router-head/router-head'

import './styles/normalize.scss'
import './styles/theme.scss'
import './styles/utility.scss'
import globalStyles from './styles/global.scss?inline'

export default component$(() => {
	useStyles$(globalStyles)

	return (
		<QwikCityProvider>
			<head>
				<meta charSet="utf-8" />
				<link rel="manifest" href="/manifest.json" />
				<script src="https://kit.fontawesome.com/e3d907997f.js" crossorigin="anonymous"></script>
				<RouterHead />
			</head>
			<body lang="en">
				<RouterOutlet />
				<ServiceWorkerRegister />
			</body>
		</QwikCityProvider>
	)
})
