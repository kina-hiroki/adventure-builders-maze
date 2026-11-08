import { defineConfig } from 'vite';

export default defineConfig({
  base: '/adventure-builders-maze/',
  build: {
    rolldownOptions: {
      input: { maze: 'index.html', tunnel: 'tunnel.html', mountain: 'mountain.html' },
      output: {
        chunkFileNames: chunk => chunk.isDynamicEntry ? 'assets/maze-view-[hash].js' : 'assets/[name]-[hash].js',
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            { name: 'three', test: /[\\/]node_modules[\\/]three[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
});
