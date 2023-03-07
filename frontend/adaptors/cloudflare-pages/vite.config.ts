import { cloudflarePagesAdaptor } from '@builder.io/qwik-city/adaptors/cloudflare-pages/vite'
import { extendConfig } from '@builder.io/qwik-city/vite'
import baseConfig from '../../vite.config'

export default extendConfig(baseConfig, () => {
	return {
		build: {
			ssr: true,
			rollupOptions: {
				input: ['src/entry.cloudflare-pages.tsx', '@qwik-city-plan'],
			},
		},
		plugins: [
			cloudflarePagesAdaptor({
				// Do not SSG as the D1 database is not available at build time, I think.
				// staticGenerate: true,
			}),
		],
	}
})
