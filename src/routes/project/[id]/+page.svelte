<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { STATUS_LABEL, STATUS_BADGE_CLASS } from '$lib/status';
	import ShareButton from '$lib/components/ShareButton.svelte';
	import AnnotationCanvas from '$lib/components/AnnotationCanvas.svelte';
	import type { Annotation, PunchStatus } from '$lib/types/database';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showForm = $state(false);
	let creating = $state(false);
	let photoPreview = $state<string | null>(null);
	let photoInput = $state<HTMLInputElement | null>(null);
	let annotations = $state<Annotation[]>([]);
	let activeFilter = $state<PunchStatus | 'all'>('all');

	const ALL_STATUSES: PunchStatus[] = ['open', 'reopened', 'resolved', 'reviewed', 'closed'];

	const counts = $derived(() => {
		const map: Partial<Record<PunchStatus, number>> = {};
		for (const item of data.items) {
			const s = item.status as PunchStatus;
			map[s] = (map[s] ?? 0) + 1;
		}
		return map;
	});

	const filteredItems = $derived(() =>
		activeFilter === 'all'
			? data.items
			: data.items.filter(i => i.status === activeFilter)
	);

	$effect(() => {
		if (form?.success) {
			showForm = false;
			photoPreview = null;
			annotations = [];
		}
	});

	function onPhotoChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		photoPreview = URL.createObjectURL(file);
	}

	function clearPhoto() {
		photoPreview = null;
		if (photoInput) photoInput.value = '';
	}
</script>

<svelte:head>
	<title>{data.project.name} — Splunch</title>
</svelte:head>

<div class="layout">
	<header class="topbar safe-top">
		<div class="topbar-inner">
			<a class="back-btn" href="/dashboard">
				<span aria-hidden="true">‹</span> Projekti
			</a>
			<span class="topbar-title">{data.project.name}</span>
			<div style="width: 5rem"></div>
		</div>
	</header>

	<main class="main container">
		{#if data.project.address}
			<p class="project-address text-secondary text-sm">{data.project.address}</p>
		{/if}

		<div class="section-header">
			<h1 class="section-title">Problemi</h1>
			<button
				class="btn btn-primary btn-sm"
				onclick={() => (showForm = !showForm)}
			>
				{showForm ? 'Odustani' : '+ Novi problem'}
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
				<h2 class="form-title">Novi problem</h2>

				{#if form?.error}
					<div class="error-banner" role="alert">{form.error}</div>
				{/if}

				<div class="field">
					<label class="label" for="title">Naslov <span aria-hidden="true">*</span></label>
					<input
						class="input"
						type="text"
						id="title"
						name="title"
						placeholder="npr. Pukotina u žbuci — soba 3"
						autocomplete="off"
						required
						disabled={creating}
					/>
				</div>

				<div class="field">
					<label class="label" for="description">Opis</label>
					<textarea
						class="textarea"
						id="description"
						name="description"
						placeholder="Dodatne napomene…"
						rows="3"
						disabled={creating}
					></textarea>
				</div>

				<div class="field">
					<label class="label" for="assigned_to">Dodijeljeno radniku</label>
					<input
						class="input"
						type="text"
						id="assigned_to"
						name="assigned_to"
						placeholder="Ime, nadimak ili email"
						autocomplete="off"
						disabled={creating}
					/>
				</div>

				<div class="field">
					<span class="label">Fotografija problema <span aria-hidden="true">*</span></span>

					<!-- Input stays in DOM so the file is always included in the form submission -->
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

					{#if photoPreview}
						<AnnotationCanvas
							src={photoPreview}
							onchange={(a) => (annotations = a)}
						/>
						<input type="hidden" name="annotations" value={JSON.stringify(annotations)} />
						<button
							type="button"
							class="photo-clear-text"
							onclick={clearPhoto}
						>Ukloni fotografiju</button>
					{:else}
						<label class="photo-picker" for="photo">
							<span class="photo-picker-icon" aria-hidden="true">📷</span>
							<span>Fotografiraj ili odaberi sliku</span>
						</label>
					{/if}
				</div>

				<button class="btn btn-primary btn-full" type="submit" disabled={creating}>
					{#if creating}<span class="spinner"></span>{/if}
					Dodaj problem
				</button>
			</form>
		{/if}

		{#if data.items.length > 0}
			<div class="filter-bar">
				<button
					class="filter-btn"
					class:active={activeFilter === 'all'}
					onclick={() => (activeFilter = 'all')}
				>
					Sve <span class="filter-count">{data.items.length}</span>
				</button>
				{#each ALL_STATUSES as status}
					{#if counts()[status]}
						<button
							class="filter-btn filter-btn-{status}"
							class:active={activeFilter === status}
							onclick={() => (activeFilter = status)}
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
				<p>Nema prijavljenih problema.</p>
				<p class="text-muted text-sm">Dodaj prvi problem gore.</p>
			</div>
		{:else if filteredItems().length === 0}
			<div class="empty">
				<p>Nema problema s ovim statusom.</p>
			</div>
		{:else}
			<ul class="item-list">
				{#each filteredItems() as item (item.id)}
					<li class="item-card card">
						<a class="item-link" href="/item/{item.share_token}">
							<div class="item-info">
								<span class="item-title">{item.title}</span>
								{#if item.assigned_to}
									<span class="item-assignee text-sm text-secondary">→ {item.assigned_to}</span>
								{/if}
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
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--text-sm);
		color: var(--color-brand-dark);
		font-weight: var(--weight-medium);
		min-width: 5rem;
	}

	.topbar-title {
		font-size: var(--text-base);
		font-weight: var(--weight-semibold);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 45%;
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
	.photo-picker {
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

	.photo-preview-wrap {
		position: relative;
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.photo-preview {
		width: 100%;
		max-height: 240px;
		object-fit: cover;
		border-radius: var(--radius-lg);
		display: block;
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

	.item-assignee {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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
