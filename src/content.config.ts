import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
	loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		status: z.enum(['Live', 'In development', 'Friends & family']),
		hook: z.string(),
		featured: z.boolean().default(true),
		icon: z.string().default('🧪'),
		projectUrl: z.string().url().optional(),
		privacyUrl: z.string().startsWith('/').optional(),
	}),
});

const legal = defineCollection({
	loader: glob({ base: './src/content/legal', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		appName: z.string(),
		language: z.string().default('nl'),
		lastUpdated: z.string(),
		packageName: z.string().optional(),
		contactEmail: z.string().email(),
	}),
});

export const collections = { projects, legal };
