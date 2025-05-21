import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
	kit: {
		adapter: adapter({
			runtime: 'nodejs18',
			regions: ['fra1'], // optional: specify deployment region
			edge: false // disable edge runtime since we're using Google Cloud Vision
		})
	},
	preprocess: vitePreprocess()
};