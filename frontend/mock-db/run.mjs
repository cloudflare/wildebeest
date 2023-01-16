import console from 'console'
import { dirname, resolve } from 'path'
import process from 'process'
import { fileURLToPath } from 'url'
import { unstable_dev } from 'wrangler'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * A simple utility to run a Cloudflare Worker that will populate a local D1 database with mock data.
 *
 * Uses Wrangler's `unstable_dev()` helper to execute the Worker and exit cleanly;
 * this is much harder to do with the command line Wrangler binary.
 */
async function main() {
	const options = {
		local: true,
		persist: true,
		nodeCompat: true,
		config: resolve(__dirname, '../../wrangler.toml'),
		tsconfig: resolve(__dirname, '../../tsconfig.json'),
		define: ['jest:{}'],
	}
	const workerPath = resolve(__dirname, './worker.ts')
	const worker = await unstable_dev(workerPath, { ...options, experimental: { disableExperimentalWarning: true } })
	await worker.fetch()
	await worker.stop()
}

main().catch((e) => {
	console.error(e)
	process.exitCode = 1
})
