<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { syncQueue } from '$lib/offline-queue';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

	let { data, children } = $props();
	let { supabase, session } = $derived(data);

	let isOnline = $state(true);

	onMount(() => {
		isOnline = navigator.onLine;

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_, newSession) => {
			// Don't invalidate auth just because token refresh failed while offline
			if (!newSession && !navigator.onLine) return;
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		async function handleOnline() {
			isOnline = true;
			await syncQueue(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);
		}

		function handleOffline() {
			isOnline = false;
		}

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			subscription.unsubscribe();
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if !isOnline}
	<div class="offline-bar" role="status" aria-live="polite">Offline — showing cached data</div>
{/if}

{@render children()}

<style>
	.offline-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 100;
		background: #374151;
		color: #d1d5db;
		text-align: center;
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.375rem 1rem;
		padding-bottom: calc(0.375rem + env(safe-area-inset-bottom));
	}
</style>
