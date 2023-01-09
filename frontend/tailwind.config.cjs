/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'wildebeest-200': 'var(--wildebeest-color-200)',
        'wildebeest-400': 'var(--wildebeest-color-400)',
        'wildebeest-500': 'var(--wildebeest-color-500)',
        'wildebeest-600': 'var(--wildebeest-color-600)',
        'wildebeest-700': 'var(--wildebeest-color-700)',
        'wildebeest-800': 'var(--wildebeest-color-800)',
        'wildebeest-900': 'var(--wildebeest-color-900)',
        'wildebeest-vibrant-400': 'var(--wildebeest-vibrant-color-400)',
        'wildebeest-vibrant-500': 'var(--wildebeest-vibrant-color-500)',
        'wildebeest-vibrant-600': 'var(--wildebeest-vibrant-color-600)',
      }
    },
  },
  plugins: [],
};
