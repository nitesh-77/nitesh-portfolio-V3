import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://nitesh-77.github.io',
  base: process.env.GITHUB_ACTIONS === 'true' ? '/nitesh-portfolio-V3/' : '/',
  output: 'static',
  trailingSlash: 'always',
  integrations: [mdx()],
});
