// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
	site: 'https://belabs.nl',
	base,
	trailingSlash: 'always',
	outDir: './dist',
	server: {
		host: true,
		port: 4322,
	},
	vite: {
		plugins: [tailwindcss()],
	},
});
