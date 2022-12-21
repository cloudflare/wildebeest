/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
	preset: 'ts-jest',
	verbose: true,
	testMatch: ["<rootDir>/test/**/(*.)+(spec|test).[jt]s?(x)"],
	testTimeout:15000,
}
