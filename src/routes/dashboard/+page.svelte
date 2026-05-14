<script lang="ts">
	import { enhance } from '$app/forms';
	import Topbar from '$lib/components/Topbar.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showNewProject = $state(false);
	let creating = $state(false);

	$effect(() => {
		if (form?.success) showNewProject = false;
	});
</script>

<svelte:head>
	<title>Projects — Splunch</title>
</svelte:head>

<div class="layout">
	<Topbar logo>
		{#snippet right()}
			{#if data.isSuperadmin}
				<a class="btn btn-ghost btn-sm" href="/admin">Admin</a>
			{/if}
			<form method="POST" action="/logout">
				<button class="btn btn-ghost btn-sm" type="submit">Log out</button>
			</form>
		{/snippet}
	</Topbar>

	<main class="main container">
		<div class="section-header">
			<h1 class="section-title">Projects</h1>
			<button
				class="btn btn-primary btn-sm"
				onclick={() => (showNewProject = !showNewProject)}
			>
				{showNewProject ? 'Cancel' : '+ New project'}
			</button>
		</div>

		{#if showNewProject}
			<form
				class="new-project-form card"
				method="POST"
				action="?/create"
				use:enhance={() => {
					creating = true;
					return async ({ update }) => {
						await update();
						creating = false;
					};
				}}
			>
				<h2 class="form-title">New project</h2>

				{#if form?.error}
					<div class="error-banner" role="alert">{form.error}</div>
				{/if}

				<div class="field">
					<label class="label" for="name">Name <span aria-hidden="true">*</span></label>
					<input
						class="input"
						type="text"
						id="name"
						name="name"
						placeholder="e.g. Main Street Building"
						autocomplete="off"
						required
						disabled={creating}
					/>
				</div>

				<div class="field">
					<label class="label" for="address">Address</label>
					<input
						class="input"
						type="text"
						id="address"
						name="address"
						placeholder="Street address"
						autocomplete="off"
						disabled={creating}
					/>
				</div>

				<button class="btn btn-primary btn-full" type="submit" disabled={creating}>
					{#if creating}<span class="spinner"></span>{/if}
					Create project
				</button>
			</form>
		{/if}

		{#if data.projects.length === 0}
			<div class="empty">
				<p>No projects yet.</p>
				<p class="text-muted text-sm">Create your first project above.</p>
			</div>
		{:else}
			<ul class="project-list">
				{#each data.projects as project (project.id)}
					<li>
						<a class="project-card card" href="/project/{project.id}">
							<div class="project-info">
								<div class="project-name-row">
									<span class="project-name">{project.name}</span>
									{#if project.role === 'member'}
										<span class="role-badge">Member</span>
									{/if}
								</div>
								{#if project.address}
									<span class="project-address text-sm text-secondary">{project.address}</span>
								{/if}
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

	.new-project-form {
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

	.empty {
		text-align: center;
		padding: var(--space-16) var(--space-4);
		color: var(--color-text-secondary);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.project-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.project-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-5);
		transition: box-shadow var(--transition-fast);
		-webkit-tap-highlight-color: transparent;
	}

	.project-card:active {
		box-shadow: var(--shadow-md);
	}

	.project-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.project-name-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
	}

	.project-name {
		font-weight: var(--weight-semibold);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.role-badge {
		flex-shrink: 0;
		font-size: var(--text-xs);
		font-weight: var(--weight-medium);
		color: var(--color-text-muted);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		padding: 1px var(--space-2);
	}

	.project-address {
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
