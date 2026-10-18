import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const assetPath = z.string().regex(/^\/(?!\/)/, 'Use a root-relative public asset path.');

export const mediaSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('placeholder') }),
  z.object({
    kind: z.literal('image'),
    src: assetPath,
    alt: z.string().min(1),
    fit: z.enum(['cover', 'contain']).optional(),
  }),
  z.object({
    kind: z.literal('video'),
    src: assetPath,
    poster: assetPath,
    alt: z.string().min(1),
  }),
]);

const work = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/work' }),
  schema: z.object({
    kind: z.enum(['project', 'oss']),
    presentation: z.enum(['article', 'visual']).default('article'),
    title: z.string().min(1),
    description: z.string().min(1),
    order: z.number().int(),
    links: z.array(z.object({ label: z.string().min(1), href: z.url() })).optional(),
    media: mediaSchema.optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    published: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { work, blog };
