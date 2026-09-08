import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './',
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                app: resolve(__dirname, 'src/main.ts'),
            },
            output: {
                inlineDynamicImports: true,
                entryFileNames: 'bundle.js',
                assetFileNames: 'bundle.[ext]',
            },
        },
    },
});
