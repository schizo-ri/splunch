<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCreateForm = $state(false);
	let creating = $state(false);
	let showPassword = $state(false);

	$effect(() => {
		if (form?.success) showCreateForm = false;
	});
</script>

<svelte:head>
	<title>Admin — Splunch</title>
</svelte:head>

<div class="layout">
	<header class="topbar safe-top">
		<div class="topbar-inner">
			<a class="back-btn" href="/dashboard">‹ Dashboard</a>
			<span class="topbar-title">Admin</span>
			<div style="width: 6rem"></div>
		</div>
	</header>

	<main class="main container">
		<div class="section-header">
			<h1 class="section-title">Users</h1>
			<button
				class="btn btn-primary btn-sm"
				onclick={() => (showCreateForm = !showCreateForm)}
			>
				{showCreateForm ? 'Cancel' : '+ New user'}
			</button>
		</div>

		{#if showCreateForm}
			<form
				class="create-form card"
				method="POST"
				action="?/create_user"
				use:enhance={() => {
					creating = true;
					return async ({ update }) => {
						await update();
						creating = false;
					};
				}}
			>
				<h2 class="form-title">New user</h2>

				{#if form?.error}
					<div class="error-banner" role="alert">{form.error}</div>
				{/if}

				<div class="field">
					<label class="label" for="email">Email <span aria-hidden="true">*</span></label>
					<input
						class="input"
						type="email"
						id="email"
						name="email"
						placeholder="user@example.com"
						autocomplete="off"
						required
						disabled={creating}
					/>
				</div>

				<div class="field">
					<label class="label" for="password">
						Temporary password <span aria-hidden="true">*</span>
					</label>
					<div class="password-row">
						<input
							class="input"
							type={showPassword ? 'text' : 'password'}
							id="password"
							name="password"
							placeholder="Min. 8 characters"
							autocomplete="new-password"
							required
							minlength="8"
							disabled={creating}
						/>
						<button
							type="button"
							class="btn btn-ghost btn-sm"
							onclick={() => (showPassword = !showPassword)}
						>
							{showPassword ? 'Hide' : 'Show'}
						</button>
					</div>
				</div>

				<button class="btn btn-primary btn-full" type="submit" disabled={creating}>
					{#if creating}<span class="spinner"></span>{/if}
					Create user
				</button>
			</form>
		{/if}

		{#if data.users.length === 0}
			<div class="empty">
				<p>No users yet.</p>
			</div>
		{:else}
			<ul class="user-list">
				{#each data.users as user (user.id)}
					<li>
						<a class="user-card card" href="/admin/user/{user.id}">
							<div class="user-info">
								<div class="user-email-row">
									<span class="user-email">{user.email}</span>
									{#if user.is_superadmin}
										<span class="badge badge-admin">Admin</span>
									{/if}
								</div>
								<span class="user-projects text-sm text-secondary">
									{#if user.projects.owner === 0 && user.projects.member === 0}
										No projects
									{:else}
										{#if user.projects.owner > 0}
											Owner: {user.projects.owner}
										{/if}
										{#if user.projects.owner > 0 && user.projects.member > 0}
											·
										{/if}
										{#if user.projects.member > 0}
											Member: {user.projects.member}
										{/if}
									{/if}
								</span>
							</div>
							<span class="arrow" aria-hidden="true">›</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</main>
</div>

<style>
	.layout {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

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
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.back-btn {
		font-size: var(--text-sm);
		color: var(--color-brand-dark);
		font-weight: var(--weight-medium);
		min-width: 6rem;
	}

	.topbar-title {
		font-size: var(--text-base);
		font-weight: var(--weight-semibold);
	}

	.btn-sm {
		min-height: 2rem;
		padding: var(--space-1) var(--space-3);
		font-size: var(--text-sm);
	}

	.main {
		flex: 1;
		padding-top: var(--space-6);
		padding-bottom: var(--space-10);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-4);
	}

	.section-title {
		font-size: var(--text-xl);
		font-weight: var(--weight-bold);
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-5);
		margin-bottom: var(--space-4);
	}

	.form-title {
		font-size: var(--text-base);
		font-weight: var(--weight-semibold);
	}

	.error-banner {
		background-color: var(--color-open-bg);
		color: var(--color-open-fg);
		border: 1px solid var(--color-open);
		border-radius: var(--radius-md);
		padding: var(--space-3) var(--space-4);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
	}

	.password-row {
		display: flex;
		gap: var(--space-2);
	}

	.password-row .input {
		flex: 1;
	}

	.empty {
		text-align: center;
		padding: var(--space-16) var(--space-4);
		color: var(--color-text-secondary);
	}

	.user-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.user-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-5);
		-webkit-tap-highlight-color: transparent;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.user-email-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.user-email {
		font-weight: var(--weight-medium);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.badge {
		flex-shrink: 0;
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		padding: 1px var(--space-2);
		border-radius: var(--radius-full);
	}

	.badge-admin {
		background: var(--color-reviewed-bg);
		color: var(--color-reviewed-fg);
		border: 1px solid var(--color-reviewed);
	}

	.user-projects {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.arrow {
		font-size: var(--text-xl);
		color: var(--color-text-muted);
		flex-shrink: 0;
		margin-left: var(--space-3);
	}
</style>
