// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	site: 'https://mistere87.github.io',
	base: '/BELabs/',
	outDir: './dist',
	server: {
		host: true,
	},
	vite: {
		plugins: [tailwindcss()],
	},
});
