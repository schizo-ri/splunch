import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: null,
			inlineWorkboxRuntime: true,
			devOptions: { enabled: true },
			manifest: {
				name: 'Splunch',
				short_name: 'Splunch',
				description: 'Construction site punch list',
				start_url: '/',
				scope: '/',
				theme_color: '#f59e0b',
				background_color: '#111827',
				display: 'standalone',
				orientation: 'portrait',
				lang: 'en',
				icons: [
					{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
					{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
					{ src: '/pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
				navigateFallback: null,
				runtimeCaching: [
					{
						urlPattern: ({ request }) => request.mode === 'navigate',
						handler: 'NetworkFirst',
						options: {
							cacheName: 'pages',
							networkTimeoutSeconds: 3,
							expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 }
						}
					},
					{
						urlPattern: ({ url }) =>
							url.origin.includes('supabase') && url.pathname.startsWith('/rest/v1/'),
						handler: 'NetworkFirst',
						options: {
							cacheName: 'supabase-rest',
							networkTimeoutSeconds: 5,
							expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }
						}
					},
					{
						urlPattern: ({ url }) =>
							url.origin.includes('supabase') &&
							url.pathname.startsWith('/storage/v1/object/public/'),
						handler: 'CacheFirst',
						options: {
							cacheName: 'supabase-photos',
							expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }
						}
					}
				]
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
