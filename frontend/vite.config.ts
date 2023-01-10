import { defineConfig } from 'vite'
import { qwikVite } from '@builder.io/qwik/optimizer'
import { qwikCity } from '@builder.io/qwik-city/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { execSync } from 'child_process'

const commitHash = execSync('git rev-parse --short HEAD').toString().replace(/\n/g, '')

export default defineConfig(() => {
	return {
		define: {
			COMMIT_INFO: JSON.stringify({ hash: commitHash }),
		},
		plugins: [
			qwikCity({
				trailingSlash: false,
			}),
			qwikVite(),
			tsconfigPaths(),
		],
		preview: {
			headers: {
				'Cache-Control': 'public, max-age=600',
			},
		},
	}
})
