/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
	preset: 'ts-jest',
	verbose: true,
	testMatch: ['<rootDir>/(backend|consumer)/test/**/(*.)+(spec|test).[jt]s?(x)'],
	testTimeout: 30000,
	testEnvironment: 'miniflare',
	// Configuration is automatically loaded from `.env`, `package.json` and
	// `wrangler.toml` files by default, but you can pass any additional Miniflare
	// API options here:
	testEnvironmentOptions: {},
}
