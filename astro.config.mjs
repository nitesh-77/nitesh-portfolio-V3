import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://nitesh.surge.sh',
  base: '/',
  output: 'static',
  trailingSlash: 'always',
  integrations: [mdx()],
});
