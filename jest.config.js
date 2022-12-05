/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  verbose: true,
  testEnvironment: "miniflare",
  // Configuration is automatically loaded from `.env`, `package.json` and
  // `wrangler.toml` files by default, but you can pass any additional Miniflare
  // API options here:
  testEnvironmentOptions: {},
};
