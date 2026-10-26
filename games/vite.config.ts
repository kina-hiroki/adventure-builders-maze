import { defineConfig } from 'vite';

export default defineConfig({
  base: '/adventure-builders-maze/',
  build: {
    rolldownOptions: {
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
