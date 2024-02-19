import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'add-data-preload-attr',
      transformIndexHtml(html) {
        return html.replace(`<html`, '<html data-theme="dim"');
      },
    },
  ],
});
