import { defineConfig } from 'vite';

export default defineConfig({
  // Tells Vite to prefix asset paths with your repository name for GitHub Pages
  base: '/Visualization/',
  build: {
    outDir: 'dist'
  }
});
