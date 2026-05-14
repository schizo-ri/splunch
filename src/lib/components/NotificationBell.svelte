<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { Database } from '$lib/types/database';

	type Notif = {
		id: string;
		message: string;
		read: boolean;
		created_at: string;
		item_token: string | null;
	};

	let { notifications, supabase }: { notifications: Notif[]; supabase: SupabaseClient<Database> } =
		$props();

	let open = $state(false);
	let localReadIds = $state(new Set<string>());

	const displayNotifications = $derived(
		notifications.map((n) => ({ ...n, read: n.read || localReadIds.has(n.id) }))
	);

	const unread = $derived(displayNotifications.filter((n) => !n.read).length);

	$effect(() => {
		if (typeof navigator === 'undefined') return;
		if ('setAppBadge' in navigator) {
			if (unread > 0) {
				(navigator as Navigator & { setAppBadge(n: number): void }).setAppBadge(unread);
			} else {
				(navigator as Navigator & { clearAppBadge(): void }).clearAppBadge();
			}
		}
	});

	async function togglePanel() {
		open = !open;
		if (open && unread > 0) {
			const unreadIds = displayNotifications.filter((n) => !n.read).map((n) => n.id);
			localReadIds = new Set([...localReadIds, ...unreadIds]);
			await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
		}
	}

	function closePanel() {
		open = false;
	}

	function formatTime(iso: string) {
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		return `${Math.floor(hrs / 24)}d ago`;
	}
</script>

{#if open}
	<div class="backdrop" onclick={() => (open = false)} role="presentation" aria-hidden="true"></div>
{/if}

<div class="bell-wrap">
	<button class="bell-btn" onclick={togglePanel} aria-label="Notifications">
		<img src="/images/icons/bell.svg" alt="" width="20" height="20" />
		{#if unread > 0}
			<span class="badge">{unread > 99 ? '99+' : unread}</span>
		{/if}
	</button>

	{#if open}
		<div class="panel">
			<div class="panel-header">Notifications</div>
			{#if displayNotifications.length === 0}
				<div class="empty">No notifications yet</div>
			{:else}
				<ul class="notif-list">
					{#each displayNotifications as notif (notif.id)}
						<li>
							{#if notif.item_token}
								<a
									class="notif-item"
									class:unread={!notif.read}
									href="/item/{notif.item_token}"
									onclick={closePanel}
								>
									<span class="notif-msg">{notif.message}</span>
									<span class="notif-time">{formatTime(notif.created_at)}</span>
								</a>
							{:else}
								<div class="notif-item" class:unread={!notif.read}>
									<span class="notif-msg">{notif.message}</span>
									<span class="notif-time">{formatTime(notif.created_at)}</span>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<style>
	.bell-wrap {
		position: relative;
	}

	.bell-btn {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: none;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		padding: 0;
		color: inherit;
	}

	.bell-btn:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	.bell-btn img {
		width: 1.25rem;
		height: 1.25rem;
	}

	.badge {
		position: absolute;
		top: 0;
		right: 0;
		min-width: 1rem;
		height: 1rem;
		padding: 0 0.25rem;
		background: #ef4444;
		color: #fff;
		font-size: 0.625rem;
		font-weight: 700;
		line-height: 1rem;
		border-radius: 0.5rem;
		text-align: center;
	}

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 49;
	}

	.panel {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		width: min(22rem, calc(100vw - 2rem));
		max-height: 24rem;
		overflow-y: auto;
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		z-index: 50;
	}

	.panel-header {
		padding: 0.75rem 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		border-bottom: 1px solid #f3f4f6;
	}

	.empty {
		padding: 1.5rem 1rem;
		font-size: 0.875rem;
		color: #9ca3af;
		text-align: center;
	}

	.notif-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.notif-item {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		width: 100%;
		text-align: left;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		border-bottom: 1px solid #f3f4f6;
		cursor: default;
		text-decoration: none;
	}

	a.notif-item {
		cursor: pointer;
	}

	.notif-item:last-child {
		border-bottom: none;
	}

	.notif-item:hover {
		background: #f9fafb;
	}

	.notif-item.unread {
		background: #eff6ff;
	}

	.notif-item.unread:hover {
		background: #dbeafe;
	}

	.notif-msg {
		font-size: 0.875rem;
		color: #111827;
		line-height: 1.4;
	}

	.notif-time {
		font-size: 0.75rem;
		color: #9ca3af;
	}
</style>
