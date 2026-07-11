import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';
import { CATEGORIES } from './consts';

// Blog collection — Markdown/MDX files in src/content/blog/
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      // Coerce string dates from frontmatter into Date objects
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      category: z.enum(CATEGORIES).default('Notes'),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      // Optional Open Graph / hero image
      heroImage: image().optional(),
    }),
});

export const collections = { blog };
