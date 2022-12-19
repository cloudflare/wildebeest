import { defineConfig } from 'vite'
import { qwikVite } from '@builder.io/qwik/optimizer'
import { qwikCity } from '@builder.io/qwik-city/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(() => {
    return {
        plugins: [qwikCity(), qwikVite(), tsconfigPaths()],
        // build: { minify: false, sourcemap: true },
        // esbuild: {
        //     minifySyntax: false,
        //     minifyIdentifiers: false,
        //     minifyWhitespace: false,
        // },
        preview: {
            headers: {
                'Cache-Control': 'public, max-age=600',
            },
        },
    }
})
