import { defineConfig } from 'vite';
import { resolve } from 'node:path';
const pages = ['index', 'io-a', 'io-b', 'io-c', 'rift-a', 'rift-b', 'mm-tranq', 'mm-cerberus', 'moon-shackleton-source', 'moon-marius-source'];
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map(id => [id, resolve(`${id}.html`)])),
      output: { manualChunks: { three: ['three'] } },
    },
  },
});
