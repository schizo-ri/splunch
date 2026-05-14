<script lang="ts">
	import { enhance } from '$app/forms';
	import Topbar from '$lib/components/Topbar.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let assigning = $state(false);
	let selectedProject = $state('');
	let selectedRole = $state<'owner' | 'member'>('owner');
	let showDeleteConfirm = $state(false);

	$effect(() => {
		if (form?.assignSuccess) selectedProject = '';
	});
</script>

<svelte:head>
	<title>{data.user.email} — Admin — Splunch</title>
</svelte:head>

<div class="layout">
	<Topbar back={{ href: '/admin', label: 'Users' }}>
		<span class="topbar-title">User</span>
	</Topbar>

	<main class="main container">
		<!-- User info -->
		<div class="user-header card">
			<div class="user-email">{data.user.email}</div>
			<div class="user-meta text-sm text-secondary">
				Created {new Date(data.user.created_at).toLocaleDateString('en')}
			</div>

			<div class="superadmin-row">
				<form method="POST" action="?/toggle_superadmin" use:enhance>
					<label class="toggle-label">
						<input
							type="checkbox"
							class="toggle-input"
							checked={data.user.is_superadmin}
							onchange={(e) => {
								e.currentTarget.form?.requestSubmit();
							}}
						/>
						<span class="toggle-text">Superadmin</span>
					</label>
				</form>
			</div>
		</div>

		<!-- Project assignments -->
		<div class="section-header">
			<h2 class="section-title">Projects</h2>
		</div>

		{#if form?.error}
			<div class="error-banner" role="alert">{form.error}</div>
		{/if}

		{#if data.memberships.length > 0}
			<ul class="project-list">
				{#each data.memberships as m (m.project_id)}
					<li class="project-row card">
						<span class="project-name">{m.project_name}</span>
						<div class="project-actions">
							<form method="POST" action="?/change_role" use:enhance>
								<input type="hidden" name="project_id" value={m.project_id} />
								<input type="hidden" name="user_id" value={data.user.id} />
								<select
									class="role-select"
									name="role"
									value={m.role}
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
								>
									<option value="owner">Owner</option>
									<option value="member">Member</option>
								</select>
							</form>
							<form method="POST" action="?/remove_project" use:enhance>
								<input type="hidden" name="project_id" value={m.project_id} />
								<input type="hidden" name="user_id" value={data.user.id} />
								<button type="submit" class="remove-btn" aria-label="Remove from project">✕</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="no-projects text-secondary text-sm">Not assigned to any projects.</p>
		{/if}

		<!-- Assign to project -->
		{#if data.availableProjects.length > 0}
			<form
				class="assign-form"
				method="POST"
				action="?/assign_project"
				use:enhance={() => {
					assigning = true;
					return async ({ update }) => {
						await update();
						assigning = false;
					};
				}}
			>
				<div class="assign-row">
					<select
						class="input"
						name="project_id"
						bind:value={selectedProject}
						disabled={assigning}
						required
					>
						<option value="" disabled>Select project…</option>
						{#each data.availableProjects as p (p.id)}
							<option value={p.id}>{p.name}</option>
						{/each}
					</select>
					<select class="input role-input" name="role" bind:value={selectedRole} disabled={assigning}>
						<option value="owner">Owner</option>
						<option value="member">Member</option>
					</select>
					<button
						class="btn btn-primary btn-sm"
						type="submit"
						disabled={assigning || !selectedProject}
					>
						{#if assigning}<span class="spinner"></span>{:else}Add{/if}
					</button>
				</div>
			</form>
		{/if}

		<!-- Danger zone -->
		<div class="danger-zone">
			<h2 class="danger-title">Danger zone</h2>
			{#if !showDeleteConfirm}
				<button
					class="btn btn-danger btn-sm"
					type="button"
					onclick={() => (showDeleteConfirm = true)}
				>
					Delete user
				</button>
			{:else}
				<p class="danger-warning text-sm">
					This will permanently delete the user and all their project memberships.
				</p>
				<div class="danger-buttons">
					<button class="btn btn-ghost btn-sm" onclick={() => (showDeleteConfirm = false)}>
						Cancel
					</button>
					<form method="POST" action="?/delete_user" use:enhance>
						<button class="btn btn-danger btn-sm" type="submit">Confirm delete</button>
					</form>
				</div>
			{/if}
		</div>
	</main>
</div>

<style>
	.layout {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
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
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.user-header {
		padding: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.user-email {
		font-size: var(--text-lg);
		font-weight: var(--weight-semibold);
		word-break: break-all;
	}

	.superadmin-row {
		margin-top: var(--space-2);
	}

	.toggle-label {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
	}

	.toggle-input {
		width: 1.1rem;
		height: 1.1rem;
		cursor: pointer;
		accent-color: var(--color-brand);
	}

	.toggle-text {
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-title {
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

	.project-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.project-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
	}

	.project-name {
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.project-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.role-select {
		font-size: var(--text-sm);
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
	}

	.remove-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		font-size: var(--text-sm);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-md);
		transition: color var(--transition-fast);
		line-height: 1;
	}

	.remove-btn:hover {
		color: var(--color-open-fg);
	}

	.no-projects {
		padding: var(--space-3) 0;
	}

	.assign-form {
		margin-top: calc(var(--space-2) * -1);
	}

	.assign-row {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}

	.assign-row .input {
		flex: 1;
		min-width: 0;
		font-size: var(--text-sm);
	}

	.role-input {
		flex: 0 0 auto;
		width: auto;
	}

	/* Danger zone */
	.danger-zone {
		margin-top: var(--space-4);
		padding-top: var(--space-5);
		border-top: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.danger-title {
		font-size: var(--text-sm);
		font-weight: var(--weight-semibold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.danger-warning {
		color: var(--color-open-fg);
	}

	.danger-buttons {
		display: flex;
		gap: var(--space-3);
	}
</style>
