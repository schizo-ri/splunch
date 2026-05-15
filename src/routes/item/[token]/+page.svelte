<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Topbar from '$lib/components/Topbar.svelte';
	import { STATUS_LABEL, STATUS_BADGE_CLASS } from '$lib/status';
	import ShareButton from '$lib/components/ShareButton.svelte';
	import AnnotationView from '$lib/components/AnnotationView.svelte';
	import { compressImage } from '$lib/compress';
	import { enqueueResolve, enqueueClose, enqueueReopen, getPendingCount, syncQueue } from '$lib/offline-queue';
	import type { PunchStatus } from '$lib/types/database';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const item = $derived(data.item);
	const problemPhoto = $derived(data.photos.find((p) => p.type === 'problem'));
	const solutionPhotos = $derived(data.photos.filter((p) => p.type === 'solution'));
	const status = $derived(item.status as PunchStatus);
	const isOwner = $derived(data.userRole === 'owner');
	const isMember = $derived(data.userRole !== null);

	let workerName = $state('');
	let resolvePhoto = $state<string | null>(null);
	let resolveBlob = $state<Blob | null>(null);
	let resolveInput = $state<HTMLInputElement | null>(null);
	let resolving = $state(false);
	let closing = $state(false);
	let reopening = $state(false);
	let _showReopenForm = $state(false);
	const showReopenForm = $derived(
		_showReopenForm && !(form?.reopenSuccess || form?.closeSuccess || form?.resolveSuccess)
	);
	let _editing = $state(false);
	const editing = $derived(_editing && !form?.updateItemSuccess);
	let saving = $state(false);
	let pendingCount = $state(0);
	let syncing = $state(false);
	let offlineQueued = $state(false);
	let closeQueued = $state(false);
	let reopenQueued = $state(false);
	let comments = $state(data.comments);

	$effect(() => {
		comments = data.comments;
	});

	onMount(() => {
		workerName = localStorage.getItem('splunch_worker_name') ?? '';
		getPendingCount().then((n) => (pendingCount = n));
		window.addEventListener('online', handleSync);

		const channel = data.supabase
			.channel(`comments-${item.id}`)
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'comments', filter: `punch_item_id=eq.${item.id}` },
				(payload) => {
					const c = payload.new as (typeof comments)[0];
					if (!comments.find((x) => x.id === c.id)) {
						comments = [...comments, c];
					}
				}
			)
			.subscribe();

		return () => {
			window.removeEventListener('online', handleSync);
			data.supabase.removeChannel(channel);
		};
	});

	function saveWorkerName() {
		if (workerName.trim()) localStorage.setItem('splunch_worker_name', workerName.trim());
	}

	async function onResolvePhoto(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const compressed = await compressImage(file);
		resolveBlob = compressed;
		resolvePhoto = URL.createObjectURL(compressed);
	}

	function clearResolvePhoto() {
		resolvePhoto = null;
		resolveBlob = null;
		if (resolveInput) resolveInput.value = '';
	}

	async function handleSync() {
		syncing = true;
		await syncQueue();
		pendingCount = await getPendingCount();
		syncing = false;
		if (pendingCount === 0) location.reload();
	}

	async function handleResolveOffline(workerNameVal: string, noteVal: string | null) {
		try {
			await enqueueResolve(item.share_token, workerNameVal, noteVal, resolveBlob);
			pendingCount = await getPendingCount();
			offlineQueued = true;
		} finally {
			resolving = false;
		}
	}

</script>

<svelte:head>
	<title>{item.title} — Splunch</title>
</svelte:head>

<div class="layout">
	<Topbar back={isMember ? { href: `/project/${item.project_id}`, label: 'Back' } : undefined} logo={!isMember}>
		<span class={STATUS_BADGE_CLASS[status]}>{STATUS_LABEL[status]}</span>
		{#snippet right()}
			<ShareButton url={page.url.href} title={item.title} iconOnly class="topbar-share" />
		{/snippet}
	</Topbar>

	<main class="main">
		<!-- Problem photo -->
		{#if problemPhoto}
			<div class="photo-block">
				<AnnotationView
					src={problemPhoto.url}
					annotations={problemPhoto.annotations}
					alt="Problem photo"
				/>
				<div class="photo-overlays">
					<span class="photo-label">Problem</span>
					<a
						href={problemPhoto.url}
						target="_blank"
						rel="noopener"
						class="photo-fullsize"
						aria-label="Open full size"
					>
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
							<path
								d="M8 2h4v4M6 8L12 2M2 6v6h6"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</a>
				</div>
			</div>
		{/if}

		<div class="content container">
			<!-- Item details -->
			<div class="item-header">
				{#if editing}
					<form
						method="POST"
						action="?/update_item"
						use:enhance={() => {
							saving = true;
							return async ({ update }) => {
								await update({ reset: false });
								saving = false;
							};
						}}
						class="edit-form"
					>
						{#if form?.action === 'update_item' && form.error}
							<div class="error-banner" role="alert">{form.error}</div>
						{/if}
						<div class="field">
							<label class="label" for="edit-title">Title <span aria-hidden="true">*</span></label>
							<input
								class="input"
								type="text"
								id="edit-title"
								name="title"
								value={item.title}
								required
								disabled={saving}
							/>
						</div>
						<div class="field">
							<label class="label" for="edit-description">Description</label>
							<textarea
								class="textarea"
								id="edit-description"
								name="description"
								rows="3"
								disabled={saving}
							>{item.description ?? ''}</textarea>
						</div>
						<div class="field">
							<label class="label" for="edit-assigned">Assigned to</label>
							<input
								class="input"
								type="text"
								id="edit-assigned"
								name="assigned_to"
								value={item.assigned_to ?? ''}
								placeholder="Name, nickname or email"
								autocomplete="off"
								disabled={saving}
							/>
						</div>
						{#if data.areas.length > 0}
							<div class="field">
								<label class="label" for="edit-area">Area</label>
								<select
									class="input"
									id="edit-area"
									name="area_id"
									value={item.area_id ?? ''}
									disabled={saving}
								>
									<option value="">No area</option>
									{#each data.areas as area (area.id)}
										<option value={area.id}>{area.name}</option>
									{/each}
								</select>
							</div>
						{/if}
						<div class="edit-buttons">
							<button
								type="button"
								class="btn btn-ghost btn-sm"
								onclick={() => (_editing = false)}
								disabled={saving}
							>Cancel</button>
							<button class="btn btn-primary btn-sm" type="submit" disabled={saving}>
								{#if saving}<span class="spinner"></span>{:else}Save{/if}
							</button>
						</div>
					</form>
				{:else}
					<div class="item-title-row">
						<h1 class="item-title">{item.title}</h1>
						{#if isMember}
							<button
								class="edit-btn"
								type="button"
								onclick={() => (_editing = true)}
								aria-label="Edit item"
							>
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</button>
						{/if}
					</div>
					{#if item.description}
						<p class="item-description text-secondary">{item.description}</p>
					{/if}

					{#if isMember && data.areas.length > 0}
						<form
							method="POST"
							action="?/update_area"
							use:enhance={() => async ({ update }) => { await update({ reset: false }) }}
							class="area-form"
						>
							<label class="area-select-label text-sm text-muted" for="area_id">📍 Area</label>
							<select
								class="area-select"
								id="area_id"
								name="area_id"
								value={item.area_id ?? ''}
								onchange={(e) => e.currentTarget.form?.requestSubmit()}
							>
								<option value="">No area</option>
								{#each data.areas as area (area.id)}
									<option value={area.id}>{area.name}</option>
								{/each}
							</select>
						</form>
					{:else if (item as any).areas?.name}
						<p class="item-meta text-sm text-muted">📍 {(item as any).areas.name}</p>
					{/if}

					{#if item.assigned_to}
						<p class="item-meta text-sm text-muted">
							Assigned to: <strong>{item.assigned_to}</strong>
						</p>
					{/if}
				{/if}
			</div>

			{#if form?.error && !form?.resolveSuccess}
				<div class="error-banner" role="alert">{form.error}</div>
			{/if}

			<!-- Solution photos (all rounds, chronological) -->
			{#if solutionPhotos.length > 0}
				<div class="solution-block">
					<h2 class="section-label">
						{solutionPhotos.length === 1 ? 'Solution' : 'Solutions'}
					</h2>
					{#each solutionPhotos as photo, i (photo.id)}
						<div class="solution-item">
							{#if solutionPhotos.length > 1}
								<div class="solution-round text-sm text-muted">
									Attempt {i + 1}
									{#if photo.created_by_name}
										— {photo.created_by_name}{/if}
								</div>
							{:else if photo.created_by_name}
								<div class="solution-round text-sm text-muted">{photo.created_by_name}</div>
							{/if}
							<img class="solution-img" src={photo.url} alt="Solution photo {i + 1}" />
						</div>
					{/each}
				</div>
			{/if}

			<!-- Worker resolve form -->
			{#if status === 'open' || status === 'reopened'}
				<div class="action-block card">
					<h2 class="section-label">Mark as resolved</h2>

					{#if offlineQueued}
						<div class="offline-banner" role="status">
							<span>Saved offline — will sync when back online.</span>
							<button class="btn btn-sm btn-secondary" onclick={handleSync} disabled={syncing}>
								{#if syncing}<span class="spinner spinner-sm"></span>{:else}Sync now{/if}
							</button>
						</div>
					{:else}
						<form
							method="POST"
							action="?/resolve"
							enctype="multipart/form-data"
							use:enhance={({ cancel, formData }) => {
								if (!navigator.onLine) {
									cancel();
									const name = (formData.get('worker_name') as string)?.trim();
									const note = (formData.get('note') as string)?.trim() || null;
									if (!name) return;
									saveWorkerName();
									resolving = true;
									handleResolveOffline(name, note);
									return;
								}
								saveWorkerName();
								resolving = true;
								return async ({ update }) => {
									await update();
									resolving = false;
								};
							}}
						>
							<div class="form-fields">
								<div class="field">
									<label class="label" for="worker_name"
										>Your name <span aria-hidden="true">*</span></label
									>
									<input
										class="input"
										type="text"
										id="worker_name"
										name="worker_name"
										bind:value={workerName}
										placeholder="Name or nickname"
										autocomplete="name"
										required
										disabled={resolving}
									/>
								</div>

								<div class="field">
									<label class="label" for="note">Note</label>
									<textarea
										class="textarea"
										id="note"
										name="note"
										placeholder="What did you do?"
										rows="2"
										disabled={resolving}
									></textarea>
								</div>

								<div class="field">
									<span class="label">Solution photo</span>
									<input
										bind:this={resolveInput}
										type="file"
										id="resolve-photo"
										name="photo"
										accept="image/*"
										disabled={resolving}
										onchange={onResolvePhoto}
										class="file-input-hidden"
									/>
									<input
										type="file"
										id="resolve-photo-camera"
										accept="image/*"
										capture="environment"
										disabled={resolving}
										onchange={onResolvePhoto}
										class="file-input-hidden"
									/>
									{#if resolvePhoto}
										<div class="photo-preview-wrap">
											<img class="photo-preview" src={resolvePhoto} alt="Preview" />
											<button
												type="button"
												class="photo-clear"
												onclick={clearResolvePhoto}
												aria-label="Remove">✕</button
											>
										</div>
									{:else}
										<div class="photo-picker-row">
											<label class="photo-picker" for="resolve-photo-camera">
												<span class="photo-picker-icon" aria-hidden="true">📷</span>
												<span>Camera</span>
											</label>
											<label class="photo-picker" for="resolve-photo">
												<span class="photo-picker-icon" aria-hidden="true">🖼️</span>
												<span>Gallery</span>
											</label>
										</div>
									{/if}
								</div>
							</div>

							<button class="btn btn-primary btn-full" type="submit" disabled={resolving}>
								{#if resolving}<span class="spinner"></span>{/if}
								Submit solution
							</button>
						</form>
					{/if}
				</div>
			{/if}

			<!-- Pending sync banner (top of page context) -->
			{#if pendingCount > 0 && !offlineQueued}
				<div class="offline-banner offline-banner-pending" role="status">
					<span>{pendingCount} solution{pendingCount > 1 ? 's' : ''} waiting to sync</span>
					<button class="btn btn-sm btn-secondary" onclick={handleSync} disabled={syncing}>
						{#if syncing}<span class="spinner spinner-sm"></span>{:else}Sync now{/if}
					</button>
				</div>
			{/if}

			<!-- Foreman controls (owner only, when resolved) -->
			{#if isOwner && status === 'resolved'}
				<div class="action-block card">
					<h2 class="section-label">Review solution</h2>

					{#if closeQueued || reopenQueued}
						<div class="offline-banner" role="status">
							<span>{closeQueued ? 'Close' : 'Return'} queued — will sync when back online.</span>
							<button class="btn btn-sm btn-secondary" onclick={handleSync} disabled={syncing}>
								{#if syncing}<span class="spinner spinner-sm"></span>{:else}Sync now{/if}
							</button>
						</div>
					{:else}
						<div class="owner-actions">
							<form
								method="POST"
								action="?/close"
								use:enhance={({ cancel, formData }) => {
									closing = true;
									if (!navigator.onLine) {
										cancel();
										const note = (formData.get('note') as string)?.trim() || null;
										enqueueClose(item.share_token, note)
											.then(async () => {
												pendingCount = await getPendingCount();
												closeQueued = true;
											})
											.catch(() => {})
											.finally(() => {
												closing = false;
											});
										return;
									}
									return async ({ update }) => {
										await update();
										closing = false;
									};
								}}
							>
								{#if form?.action === 'close' && form.error}
									<div class="error-banner" role="alert">{form.error}</div>
								{/if}
								<div class="field">
									<label class="label" for="close-note">Comment (optional)</label>
									<input
										class="input"
										type="text"
										id="close-note"
										name="note"
										placeholder="Looks good."
										disabled={closing}
									/>
								</div>
								<button
									class="btn btn-primary btn-full"
									type="submit"
									disabled={closing || reopening}
								>
									{#if closing}<span class="spinner"></span>{/if}
									Close — accept solution
								</button>
							</form>

							{#if !showReopenForm}
								<button
									class="btn btn-secondary btn-full"
									onclick={() => (_showReopenForm = true)}
									disabled={closing}
								>
									Return for repair
								</button>
							{:else}
								<form
									method="POST"
									action="?/reopen"
									use:enhance={({ cancel, formData }) => {
										reopening = true;
										if (!navigator.onLine) {
											cancel();
											const note = (formData.get('note') as string)?.trim();
											if (!note) {
												reopening = false;
												return;
											}
											enqueueReopen(item.share_token, note)
												.then(async () => {
													pendingCount = await getPendingCount();
													reopenQueued = true;
												})
												.catch(() => {})
												.finally(() => {
													reopening = false;
												});
											return;
										}
										return async ({ update }) => {
											await update();
											reopening = false;
										};
									}}
								>
									{#if form?.action === 'reopen' && form.error}
										<div class="error-banner" role="alert">{form.error}</div>
									{/if}
									<div class="field">
										<label class="label" for="reopen-note"
											>Reason for return <span aria-hidden="true">*</span></label
										>
										<textarea
											class="textarea"
											id="reopen-note"
											name="note"
											placeholder="What needs to be fixed?"
											rows="2"
											required
											disabled={reopening}
										></textarea>
									</div>
									<div class="row-buttons">
										<button
											class="btn btn-ghost"
											type="button"
											onclick={() => (_showReopenForm = false)}
											disabled={reopening}
										>
											Cancel
										</button>
										<button class="btn btn-danger" type="submit" disabled={reopening || closing}>
											{#if reopening}<span class="spinner"></span>{/if}
											Return for repair
										</button>
									</div>
								</form>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Comments -->
			{#if comments.length > 0}
				<div class="comments-block">
					<h2 class="section-label">Activity</h2>
					<ul class="comment-list">
						{#each comments as comment (comment.id)}
							<li class="comment">
								<span class="comment-author font-medium">{comment.author_name}</span>
								<span class="comment-body text-secondary">{comment.body}</span>
								<span class="comment-time text-muted text-sm">
									{new Date(comment.created_at!).toLocaleString('en')}
								</span>
							</li>
						{/each}
					</ul>
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
		background: var(--color-bg);
	}


	.main {
		flex: 1;
		padding-bottom: var(--space-12) safe-bottom;
		padding-bottom: calc(var(--space-12) + env(safe-area-inset-bottom));
	}

	/* Problem photo — full bleed */
	.photo-block {
		position: relative;
		width: 100%;
		background: #000;
	}

	@media (min-width: 1024px) {
		.photo-block {
			max-width: 900px;
			margin-inline: auto;
			border-radius: var(--radius-lg);
			overflow: hidden;
		}
	}

	.photo-overlays {
		position: absolute;
		bottom: var(--space-3);
		left: var(--space-3);
		right: var(--space-3);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.photo-label {
		background: rgb(0 0 0 / 0.55);
		color: #fff;
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
	}

	.photo-fullsize {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		background: rgb(0 0 0 / 0.55);
		color: #fff;
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast);
	}

	.photo-fullsize:hover {
		background: rgb(0 0 0 / 0.8);
	}

	.content {
		padding-top: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.item-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.item-title {
		font-size: var(--text-xl);
		font-weight: var(--weight-bold);
		line-height: var(--leading-tight);
	}

	.item-title-row {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
	}

	.edit-btn {
		flex-shrink: 0;
		margin-top: 4px;
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		transition: color var(--transition-fast);
		line-height: 1;
	}

	.edit-btn:hover {
		color: var(--color-text);
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.edit-buttons {
		display: flex;
		gap: var(--space-2);
		justify-content: flex-end;
	}

	.item-description {
		line-height: var(--leading-relaxed);
	}

	.item-meta {
		line-height: var(--leading-normal);
	}

	.area-form {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.area-select-label {
		white-space: nowrap;
	}

	.area-select {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		background: transparent;
		border: none;
		border-bottom: 1px dashed var(--color-border-strong);
		padding: 1px var(--space-1);
		cursor: pointer;
		min-width: 0;
	}

	.area-select:focus {
		outline: none;
		border-bottom-color: var(--color-brand);
		color: var(--color-text);
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

	/* Solution */
	.solution-block {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.solution-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.solution-round {
		padding-left: var(--space-1);
	}

	.solution-img {
		width: 100%;
		border-radius: var(--radius-lg);
		object-fit: cover;
		max-height: 280px;
	}

	/* Action block */
	.action-block {
		padding: var(--space-5);
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}

	.field:last-of-type {
		margin-bottom: var(--space-4);
	}

	.section-label {
		font-size: var(--text-base);
		font-weight: var(--weight-semibold);
		margin-bottom: var(--space-4);
	}

	.owner-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.row-buttons {
		display: flex;
		gap: var(--space-3);
		margin-top: var(--space-3);
	}

	.row-buttons .btn {
		flex: 1;
	}

	/* Photo picker (same as project page) */
	.file-input-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

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
		max-height: 200px;
		object-fit: cover;
		display: block;
	}

	.photo-clear {
		position: absolute;
		top: var(--space-2);
		right: var(--space-2);
		width: 2rem;
		height: 2rem;
		border-radius: var(--radius-full);
		background: rgb(0 0 0 / 0.6);
		color: #fff;
		border: none;
		cursor: pointer;
		font-size: var(--text-sm);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Offline banner */
	.offline-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	.offline-banner-pending {
		background: color-mix(in srgb, var(--color-brand) 8%, transparent);
		border-color: color-mix(in srgb, var(--color-brand) 30%, transparent);
		color: var(--color-text);
	}

	.spinner-sm {
		width: 0.8em;
		height: 0.8em;
	}

	/* Comments */
	.comments-block {
		padding-bottom: var(--space-4);
	}

	.comment-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.comment {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding-left: var(--space-3);
		border-left: 2px solid var(--color-border);
	}

	.comment-body {
		line-height: var(--leading-relaxed);
	}
</style>
