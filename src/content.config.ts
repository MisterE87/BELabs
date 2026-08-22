import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projectFact = z.object({
	label: z.string(),
	value: z.string(),
});

const projectHighlight = z.object({
	title: z.string(),
	description: z.string(),
	icon: z.string().optional(),
});

const projectGalleryItem = z
	.object({
		file: z.string().optional(),
		files: z.array(z.string()).min(1).optional(),
		alt: z.string(),
		title: z.string().optional(),
		caption: z.string().optional(),
		orientation: z.enum(['portrait', 'landscape']).default('landscape'),
	})
	.refine((item) => item.file || (item.files && item.files.length > 0), {
		message: 'Gallery item needs file or files',
	});

const projects = defineCollection({
	loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		status: z.enum(['Live', 'In development', 'Friends & family']),
		hook: z.string(),
		featured: z.boolean().default(true),
		icon: z.string().default('🧪'),
		projectUrl: z.string().url().optional(),
		captureUrl: z.string().url().optional(),
		privacyUrl: z.string().startsWith('/').optional(),
		showcase: z.boolean().default(false),
		heroOrientation: z.enum(['portrait', 'landscape']).optional(),
		facts: z.array(projectFact).optional(),
		highlights: z.array(projectHighlight).optional(),
		gallery: z.array(projectGalleryItem).optional(),
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
