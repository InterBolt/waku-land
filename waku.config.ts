import { defineConfig } from 'waku/config';

export default defineConfig({
  htmlHead: `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script defer data-domain="waku.land" src="https://plausible.io/js/script.js"></script>
  `,
});
