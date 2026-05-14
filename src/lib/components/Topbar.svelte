<script lang="ts">
	import { getContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import NotificationBell from './NotificationBell.svelte';
	import type { NotifContext } from '$lib/types/notifications';

	let {
		back,
		logo = false,
		children,
		right
	}: {
		back?: { href: string; label: string };
		logo?: boolean;
		children?: Snippet;
		right?: Snippet;
	} = $props();

	const notif = getContext<NotifContext | undefined>('notif');
</script>

<header class="topbar safe-top">
	<div class="topbar-inner">
		<div class="topbar-left">
			{#if back}
				<a class="back-btn" href={back.href}>‹ {back.label}</a>
			{:else if logo}
				<span class="topbar-logo">Splunch</span>
			{/if}
		</div>

		<div class="topbar-center">
			{@render children?.()}
		</div>

		<div class="topbar-right">
			{@render right?.()}
			{#if notif?.user}
				<NotificationBell notifications={notif.notifications} supabase={notif.supabase} />
			{/if}
		</div>
	</div>
</header>

<style>
	.topbar {
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.topbar-inner {
		max-width: 640px;
		margin-inline: auto;
		padding-inline: var(--space-4);
		padding-block: var(--space-3);
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
	}

	.topbar-left {
		display: flex;
		align-items: center;
	}

	.topbar-center {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.topbar-right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-2);
	}

	.back-btn {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--text-sm);
		color: var(--color-brand-dark);
		font-weight: var(--weight-medium);
	}

	.topbar-logo {
		font-size: var(--text-lg);
		font-weight: var(--weight-bold);
		letter-spacing: -0.02em;
	}

	:global(.topbar-center .topbar-title) {
		font-size: var(--text-base);
		font-weight: var(--weight-semibold);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
		text-align: center;
	}

	:global(.topbar-share) {
		border: none !important;
		background: transparent !important;
		color: var(--color-text-secondary) !important;
	}

	:global(.topbar-share:hover) {
		background: var(--color-bg) !important;
		color: var(--color-text) !important;
	}
</style>
