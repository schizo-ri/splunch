<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Topbar from '$lib/components/Topbar.svelte';
	import { STATUS_LABEL, STATUS_BADGE_CLASS } from '$lib/status';
	import ShareButton from '$lib/components/ShareButton.svelte';
	import AnnotationCanvas from '$lib/components/AnnotationCanvas.svelte';
	import type { Annotation, PunchStatus } from '$lib/types/database';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let items = $state(data.items);

	$effect(() => {
		items = data.items;
	});

	let showForm = $state(false);
	let showAreaForm = $state(false);
	let manageAreas = $state(false);
	let showArchivedAreas = $state(false);
	let creating = $state(false);
	let creatingArea = $state(false);
	let photoPreview = $state<string | null>(null);
	let photoInput = $state<HTMLInputElement | null>(null);
	let annotations = $state<Annotation[]>([]);
	let activeStatus = $state<PunchStatus | 'all'>('all');
	let activeArea = $state<string | 'all'>('all');
	let formAreaId = $state('');

	const ALL_STATUSES: PunchStatus[] = ['open', 'reopened', 'resolved', 'reviewed', 'closed'];

	const counts = $derived(() => {
		const map: Partial<Record<PunchStatus, number>> = {};
		for (const i of items) {
			const s = i.status as PunchStatus;
			map[s] = (map[s] ?? 0) + 1;
		}
		return map;
	});

	const filteredItems = $derived(() => {
		let list = items;
		if (activeStatus !== 'all') list = list.filter((i) => i.status === activeStatus);
		if (activeArea !== 'all') list = list.filter((i) => i.area_id === activeArea);
		return list;
	});

	const areaMap = $derived(() => new Map(data.areas.map((a) => [a.id, a.name])));

	$effect(() => {
		if (form?.success) {
			showForm = false;
			photoPreview = null;
			annotations = [];
		}
		if (form?.areaSuccess) {
			showAreaForm = false;
		}
	});

	onMount(() => {
		const channel = data.supabase
			.channel(`project-items-${data.project.id}`)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'punch_items', filter: `project_id=eq.${data.project.id}` },
				(payload) => {
					const updated = payload.new as (typeof items)[0];
					items = items.map((i) => (i.id === updated.id ? { ...i, ...updated } : i));
				}
			)
			.subscribe();

		return () => {
			data.supabase.removeChannel(channel);
		};
	});

	function openIssueForm() {
		showForm = !showForm;
		if (showForm) formAreaId = activeArea !== 'all' ? activeArea : '';
	}

	function onPhotoChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		photoPreview = URL.createObjectURL(file);
	}

	function clearPhoto() {
		photoPreview = null;
		if (photoInput) photoInput.value = '';
	}

	function selectArea(id: string | 'all') {
		if (manageAreas) return;
		activeArea = id;
	}
</script>

<svelte:head>
	<title>{data.project.name} — Splunch</title>
</svelte:head>

<div class="layout">
	<Topbar back={{ href: '/dashboard', label: 'Projects' }}>
		<span class="topbar-title">{data.project.name}</span>
	</Topbar>

	<main class="main container">
		{#if data.project.address}
			<p class="project-address text-secondary text-sm">{data.project.address}</p>
		{/if}

		<!-- Areas section -->
		<div class="areas-section">
			<div class="areas-header">
				<span class="areas-label">Areas</span>
				{#if data.userRole === 'owner'}
					<button
						class="btn-text"
						type="button"
						onclick={() => { manageAreas = !manageAreas; showAreaForm = false; }}
					>
						{manageAreas ? 'Done' : 'Manage'}
					</button>
				{/if}
			</div>

			<div class="areas-chips">
				{#if !manageAreas}
					<button
						class="area-chip"
						class:active={activeArea === 'all'}
						type="button"
						onclick={() => selectArea('all')}
					>All</button>
				{/if}

				{#each data.areas as area (area.id)}
					{#if manageAreas}
						<div class="area-chip-manage">
							<span class="area-chip-name">{area.name}</span>
							<form method="POST" action="?/archive_area" use:enhance>
								<input type="hidden" name="id" value={area.id} />
								<button type="submit" class="area-archive-btn" aria-label="Archive {area.name}">
									Archive
								</button>
							</form>
						</div>
					{:else}
						<button
							class="area-chip"
							class:active={activeArea === area.id}
							type="button"
							onclick={() => selectArea(area.id)}
						>{area.name}</button>
					{/if}
				{/each}

				{#if !manageAreas}
					<button
						class="area-chip area-chip-add"
						type="button"
						onclick={() => (showAreaForm = !showAreaForm)}
					>+ Add area</button>
				{/if}
			</div>

			{#if showAreaForm}
				<form
					class="area-add-form"
					method="POST"
					action="?/create_area"
					use:enhance={() => {
						creatingArea = true;
						return async ({ update }) => {
							await update();
							creatingArea = false;
						};
					}}
				>
					{#if form?.action === 'create_area' && form.error}
						<p class="area-error" role="alert">{form.error}</p>
					{/if}
					<div class="area-input-row">
						<input
							class="input"
							type="text"
							name="name"
							placeholder="Area name"
							list="area-suggestions"
							autocomplete="off"
							required
							disabled={creatingArea}
						/>
						<datalist id="area-suggestions">
							{#each data.areaTemplates as t (t.id)}
								<option value={t.name}>{t.name}</option>
							{/each}
						</datalist>
						<button class="btn btn-primary btn-sm" type="submit" disabled={creatingArea}>
							{#if creatingArea}<span class="spinner"></span>{:else}Add{/if}
						</button>
					</div>
				</form>
			{/if}

			{#if manageAreas && data.archivedAreas.length > 0}
				<button
					class="btn-text archived-toggle"
					type="button"
					onclick={() => (showArchivedAreas = !showArchivedAreas)}
				>
					{showArchivedAreas ? 'Hide' : 'Show'} archived ({data.archivedAreas.length})
				</button>

				{#if showArchivedAreas}
					<div class="archived-list">
						{#each data.archivedAreas as area (area.id)}
							<div class="archived-row">
								<span class="archived-name">{area.name}</span>
								<div class="archived-actions">
									<form method="POST" action="?/unarchive_area" use:enhance>
										<input type="hidden" name="id" value={area.id} />
										<button type="submit" class="btn-text">Restore</button>
									</form>
									<form method="POST" action="?/delete_area" use:enhance>
										<input type="hidden" name="id" value={area.id} />
										<button
											type="submit"
											class="btn-text btn-text-danger"
											onclick={(e) => {
												if (!confirm('Permanently delete this area? Items will not be deleted.')) e.preventDefault();
											}}
										>Delete</button>
									</form>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>

		<div class="section-header">
			<h1 class="section-title">Issues</h1>
			<button class="btn btn-primary btn-sm" onclick={openIssueForm}>
				{showForm ? 'Cancel' : '+ New issue'}
			</button>
		</div>

		{#if showForm}
			<form
				class="new-item-form card"
				method="POST"
				action="?/create"
				enctype="multipart/form-data"
				use:enhance={() => {
					creating = true;
					return async ({ update }) => {
						await update();
						creating = false;
					};
				}}
			>
				<h2 class="form-title">New issue</h2>

				{#if form?.action === 'create' && form.error}
					<div class="error-banner" role="alert">{form.error}</div>
				{/if}

				<div class="field">
					<label class="label" for="title">Title <span aria-hidden="true">*</span></label>
					<input
						class="input"
						type="text"
						id="title"
						name="title"
						placeholder="e.g. Crack in plaster — room 3"
						autocomplete="off"
						required
						disabled={creating}
					/>
				</div>

				{#if data.areas.length > 0}
					<div class="field">
						<label class="label" for="area_id">Area</label>
						<select
							class="input"
							id="area_id"
							name="area_id"
							bind:value={formAreaId}
							disabled={creating}
						>
							<option value="">No area</option>
							{#each data.areas as area (area.id)}
								<option value={area.id}>{area.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				<div class="field">
					<label class="label" for="description">Description</label>
					<textarea
						class="textarea"
						id="description"
						name="description"
						placeholder="Additional notes…"
						rows="3"
						disabled={creating}
					></textarea>
				</div>

				<div class="field">
					<label class="label" for="assigned_to">Assigned to</label>
					<input
						class="input"
						type="text"
						id="assigned_to"
						name="assigned_to"
						placeholder="Name, nickname or email"
						autocomplete="off"
						disabled={creating}
					/>
				</div>

				<div class="field">
					<span class="label">Problem photo <span aria-hidden="true">*</span></span>

					<input
						bind:this={photoInput}
						type="file"
						id="photo"
						name="photo"
						accept="image/*"
						required
						disabled={creating}
						onchange={onPhotoChange}
						class="file-input-hidden"
					/>
					<input
						type="file"
						id="photo-camera"
						accept="image/*"
						capture="environment"
						disabled={creating}
						onchange={onPhotoChange}
						class="file-input-hidden"
					/>

					{#if photoPreview}
						<AnnotationCanvas src={photoPreview} onchange={(a) => (annotations = a)} />
						<input type="hidden" name="annotations" value={JSON.stringify(annotations)} />
						<button type="button" class="photo-clear-text" onclick={clearPhoto}>Remove photo</button>
					{:else}
						<div class="photo-picker-row">
							<label class="photo-picker" for="photo-camera">
								<span class="photo-picker-icon" aria-hidden="true">📷</span>
								<span>Camera</span>
							</label>
							<label class="photo-picker" for="photo">
								<span class="photo-picker-icon" aria-hidden="true">🖼️</span>
								<span>Gallery</span>
							</label>
						</div>
					{/if}
				</div>

				<button class="btn btn-primary btn-full" type="submit" disabled={creating}>
					{#if creating}<span class="spinner"></span>{/if}
					Add issue
				</button>
			</form>
		{/if}

		{#if data.items.length > 0}
			<div class="filter-bar">
				<button
					class="filter-btn"
					class:active={activeStatus === 'all'}
					onclick={() => (activeStatus = 'all')}
				>
					All <span class="filter-count">{data.items.length}</span>
				</button>
				{#each ALL_STATUSES as status}
					{#if counts()[status]}
						<button
							class="filter-btn filter-btn-{status}"
							class:active={activeStatus === status}
							onclick={() => (activeStatus = status)}
						>
							{STATUS_LABEL[status]}
							<span class="filter-count">{counts()[status]}</span>
						</button>
					{/if}
				{/each}
			</div>
		{/if}

		{#if data.items.length === 0}
			<div class="empty">
				<p>No reported issues.</p>
				<p class="text-muted text-sm">Add your first issue above.</p>
			</div>
		{:else if filteredItems().length === 0}
			<div class="empty">
				<p>No issues with this filter.</p>
			</div>
		{:else}
			<ul class="item-list">
				{#each filteredItems() as item (item.id)}
					<li class="item-card card">
						<a class="item-link" href="/item/{item.share_token}">
							<div class="item-info">
								<span class="item-title">{item.title}</span>
								<div class="item-meta">
									{#if item.area_id && areaMap().get(item.area_id)}
										<span class="item-area text-sm text-secondary">
											{areaMap().get(item.area_id)}
										</span>
									{/if}
									{#if item.assigned_to}
										<span class="item-assignee text-sm text-secondary">→ {item.assigned_to}</span>
									{/if}
								</div>
							</div>
							<span class={STATUS_BADGE_CLASS[item.status as PunchStatus]}>
								{STATUS_LABEL[item.status as PunchStatus]}
							</span>
						</a>
						<ShareButton
							url="{page.url.origin}/item/{item.share_token}"
							title={item.title}
							iconOnly
							class="item-share"
						/>
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

	.topbar-title {
		font-size: var(--text-base);
		font-weight: var(--weight-semibold);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
		text-align: center;
	}

	.btn-sm {
		min-height: 2rem;
		padding: var(--space-1) var(--space-3);
		font-size: var(--text-sm);
	}

	.main {
		flex: 1;
		padding-top: var(--space-5);
		padding-bottom: var(--space-10);
	}

	.project-address {
		margin-bottom: var(--space-4);
	}

	/* Areas section */
	.areas-section {
		margin-bottom: var(--space-5);
	}

	.areas-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-2);
	}

	.areas-label {
		font-size: var(--text-sm);
		font-weight: var(--weight-semibold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.btn-text {
		background: none;
		border: none;
		padding: 0;
		font-size: var(--text-sm);
		color: var(--color-brand-dark);
		font-weight: var(--weight-medium);
		cursor: pointer;
	}

	.btn-text-danger {
		color: var(--color-open-fg);
	}

	.areas-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.area-chip {
		display: inline-flex;
		align-items: center;
		padding: var(--space-1) var(--space-3);
		min-height: 2rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-full);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
		-webkit-tap-highlight-color: transparent;
	}

	.area-chip.active {
		border-color: var(--color-brand);
		background: var(--color-brand-light, #fef3c7);
		color: var(--color-text);
	}

	.area-chip-add {
		border-style: dashed;
	}

	.area-chip-manage {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-full);
		background: var(--color-surface);
		font-size: var(--text-sm);
	}

	.area-chip-name {
		font-weight: var(--weight-medium);
	}

	.area-archive-btn {
		background: none;
		border: none;
		padding: 2px var(--space-1);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: color var(--transition-fast);
	}

	.area-archive-btn:hover {
		color: var(--color-open-fg);
	}

	.area-add-form {
		margin-top: var(--space-3);
	}

	.area-input-row {
		display: flex;
		gap: var(--space-2);
	}

	.area-input-row .input {
		flex: 1;
	}

	.area-error {
		font-size: var(--text-sm);
		color: var(--color-open-fg);
		margin-bottom: var(--space-2);
	}

	.archived-toggle {
		margin-top: var(--space-3);
		display: block;
	}

	.archived-list {
		margin-top: var(--space-2);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.archived-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
	}

	.archived-name {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	.archived-actions {
		display: flex;
		gap: var(--space-3);
	}

	/* Section header */
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

	/* New issue form */
	.new-item-form {
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

	/* Photo picker */
	.photo-picker-row {
		display: flex;
		gap: var(--space-3);
	}

	.photo-picker {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-6);
		border: 2px dashed var(--color-border-strong);
		border-radius: var(--radius-lg);
		cursor: pointer;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		transition: border-color var(--transition-fast);
	}

	.photo-picker:hover {
		border-color: var(--color-brand);
	}

	.file-input-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.photo-picker-icon {
		font-size: var(--text-3xl);
	}

	.photo-clear-text {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		cursor: pointer;
		text-decoration: underline;
		padding: 0;
		text-align: left;
	}

	/* Item list */
	.empty {
		text-align: center;
		padding: var(--space-16) var(--space-4);
		color: var(--color-text-secondary);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.item-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.item-card {
		position: relative;
	}

	.item-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-5);
		padding-right: calc(var(--space-5) + 2.5rem);
		-webkit-tap-highlight-color: transparent;
	}

	:global(.item-share) {
		position: absolute !important;
		top: 50%;
		right: var(--space-3);
		transform: translateY(-50%);
		border: none !important;
		background: transparent !important;
		color: var(--color-text-secondary) !important;
	}

	:global(.item-share:hover) {
		background: var(--color-bg) !important;
		color: var(--color-text) !important;
	}

	.item-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
		flex: 1;
	}

	.item-title {
		font-weight: var(--weight-medium);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.item-area,
	.item-assignee {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-area::before {
		content: '📍 ';
		font-style: normal;
	}

	/* Filter bar */
	.filter-bar {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
		margin-bottom: var(--space-4);
	}

	.filter-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-3);
		min-height: 2rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-full);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.filter-btn.active,
	.filter-btn:hover {
		border-color: var(--color-brand);
		background: var(--color-brand-light, #fef3c7);
		color: var(--color-text);
	}

	.filter-btn-open.active    { border-color: var(--color-open);     background: var(--color-open-bg);     color: var(--color-open-fg); }
	.filter-btn-resolved.active{ border-color: var(--color-resolved);  background: var(--color-resolved-bg); color: var(--color-resolved-fg); }
	.filter-btn-reviewed.active{ border-color: var(--color-reviewed);  background: var(--color-reviewed-bg); color: var(--color-reviewed-fg); }
	.filter-btn-closed.active  { border-color: var(--color-closed);    background: var(--color-closed-bg);   color: var(--color-closed-fg); }
	.filter-btn-reopened.active{ border-color: var(--color-reopened);  background: var(--color-reopened-bg); color: var(--color-reopened-fg); }

	.filter-count {
		font-weight: var(--weight-semibold);
		font-variant-numeric: tabular-nums;
	}
</style>
