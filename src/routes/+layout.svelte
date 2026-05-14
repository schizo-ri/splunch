<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { syncQueue } from '$lib/offline-queue';
	import NotificationBell from '$lib/components/NotificationBell.svelte';
	import type { Notification } from '$lib/types/database';

	let { data, children } = $props();
	let { supabase, session } = $derived(data);

	let isOnline = $state(true);
	let extraNotifications = $state<Notification[]>([]);

	const allNotifications = $derived.by(() => {
		const base = data.notifications ?? [];
		const baseIds = new Set(base.map((n) => n.id));
		const prepend = extraNotifications.filter((n) => !baseIds.has(n.id));
		return [...prepend, ...base];
	});

	onMount(() => {
		isOnline = navigator.onLine;

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_, newSession) => {
			if (!newSession && !navigator.onLine) return;
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		async function handleOnline() {
			isOnline = true;
			await syncQueue();
		}

		function handleOffline() {
			isOnline = false;
		}

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		let notifChannel: ReturnType<typeof supabase.channel> | null = null;
		if (data.user) {
			notifChannel = supabase
				.channel(`notifications-${data.user.id}`)
				.on(
					'postgres_changes',
					{
						event: 'INSERT',
						schema: 'public',
						table: 'notifications',
						filter: `user_id=eq.${data.user.id}`
					},
					(payload) => {
						const n = payload.new as Notification;
						if (!extraNotifications.find((x) => x.id === n.id)) {
							extraNotifications = [n, ...extraNotifications];
						}
					}
				)
				.subscribe();
		}

		return () => {
			subscription.unsubscribe();
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
			if (notifChannel) supabase.removeChannel(notifChannel);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if !isOnline}
	<div class="offline-bar" role="status" aria-live="polite">Offline — showing cached data</div>
{/if}

{#if data.user}
	<div class="notif-wrapper">
		<NotificationBell notifications={allNotifications} {supabase} />
	</div>
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

	.notif-wrapper {
		position: fixed;
		top: calc(env(safe-area-inset-top, 0px) + 0.625rem);
		right: 1rem;
		z-index: 50;
	}
</style>
