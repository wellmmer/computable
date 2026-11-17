import { compile } from '@mdx-js/mdx';
import { fileURLToPath } from 'node:url';
import remarkGfm from 'remark-gfm';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      // Compiles .mdx files the way @next/mdx does for the app, with the same components file.
      name: 'mdx',
      enforce: 'pre',
      async transform(source, id) {
        if (!id.endsWith('.mdx')) return null;
        return { code: String(await compile(source, { providerImportSource: '@/mdx-components', remarkPlugins: [remarkGfm] })), map: null };
      },
    },
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    setupFiles: ['src/test/jsdom-setup.ts'],
    // next-intl imports "next/server" without ".js", which Node cannot find. Vite resolves it.
    server: { deps: { inline: ['next-intl'] } },
  },
});
