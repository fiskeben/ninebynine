import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
	kit: {
		adapter: adapter({
			runtime: 'nodejs22.x',
			regions: ['fra1'], // optional: specify deployment region
		})
	},
	preprocess: vitePreprocess()
};