<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { STATUS_LABEL, STATUS_BADGE_CLASS } from '$lib/status';
	import ShareButton from '$lib/components/ShareButton.svelte';
	import AnnotationView from '$lib/components/AnnotationView.svelte';
	import type { PunchStatus } from '$lib/types/database';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const item = $derived(data.item);
	const problemPhoto = $derived(data.photos.find((p) => p.type === 'problem'));
	const solutionPhotos = $derived(data.photos.filter((p) => p.type === 'solution'));
	const status = $derived(item.status as PunchStatus);

	let workerName = $state('');
	let resolvePhoto = $state<string | null>(null);
	let resolveInput = $state<HTMLInputElement | null>(null);
	let resolving = $state(false);
	let closing = $state(false);
	let reopening = $state(false);
	let showReopenForm = $state(false);

	onMount(() => {
		workerName = localStorage.getItem('splunch_worker_name') ?? '';
	});

	function saveWorkerName() {
		if (workerName.trim()) localStorage.setItem('splunch_worker_name', workerName.trim());
	}

	function onResolvePhoto(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) resolvePhoto = URL.createObjectURL(file);
	}

	function clearResolvePhoto() {
		resolvePhoto = null;
		if (resolveInput) resolveInput.value = '';
	}

	$effect(() => {
		if (form?.resolveSuccess || form?.closeSuccess || form?.reopenSuccess) {
			showReopenForm = false;
		}
	});
</script>

<svelte:head>
	<title>{item.title} — Splunch</title>
</svelte:head>

<div class="layout">
	<header class="topbar safe-top">
		<div class="topbar-inner">
			{#if data.isOwner}
				<a class="back-btn" href="/project/{item.project_id}">‹ Back</a>
			{:else}
				<span class="topbar-logo">Splunch</span>
			{/if}
			<span class={STATUS_BADGE_CLASS[status]}>{STATUS_LABEL[status]}</span>
			<ShareButton url={page.url.href} title={item.title} iconOnly class="topbar-share" />
		</div>
	</header>

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
				<h1 class="item-title">{item.title}</h1>
				{#if item.description}
					<p class="item-description text-secondary">{item.description}</p>
				{/if}
				{#if item.assigned_to}
					<p class="item-assigned text-sm text-muted">
						Assigned to: <strong>{item.assigned_to}</strong>
					</p>
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

					<form
						method="POST"
						action="?/resolve"
						enctype="multipart/form-data"
						use:enhance={() => {
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
								<span class="label">Solution photo <span aria-hidden="true">*</span></span>
								<input
									bind:this={resolveInput}
									type="file"
									id="resolve-photo"
									name="photo"
									accept="image/*"
									required
									disabled={resolving}
									onchange={onResolvePhoto}
									class="file-input-hidden"
								/>
								{#if resolvePhoto}
									<div class="photo-preview-wrap">
										<img class="photo-preview" src={resolvePhoto} alt="Pregled" />
										<button
											type="button"
											class="photo-clear"
											onclick={clearResolvePhoto}
											aria-label="Remove">✕</button
										>
									</div>
								{:else}
									<label class="photo-picker" for="resolve-photo">
										<span class="photo-picker-icon" aria-hidden="true">📷</span>
										<span>Take a photo or choose an image</span>
									</label>
								{/if}
							</div>
						</div>

						<button class="btn btn-primary btn-full" type="submit" disabled={resolving}>
							{#if resolving}<span class="spinner"></span>{/if}
							Submit solution
						</button>
					</form>
				</div>
			{/if}

			<!-- Foreman controls (owner only, when resolved) -->
			{#if data.isOwner && status === 'resolved'}
				<div class="action-block card">
					<h2 class="section-label">Review solution</h2>

					<div class="owner-actions">
						<form
							method="POST"
							action="?/close"
							use:enhance={() => {
								closing = true;
								return async ({ update }) => {
									await update();
									closing = false;
								};
							}}
						>
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
								onclick={() => (showReopenForm = true)}
								disabled={closing}
							>
								Return for repair
							</button>
						{:else}
							<form
								method="POST"
								action="?/reopen"
								use:enhance={() => {
									reopening = true;
									return async ({ update }) => {
										await update();
										reopening = false;
									};
								}}
							>
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
										onclick={() => (showReopenForm = false)}
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
				</div>
			{/if}

			<!-- Comments -->
			{#if data.comments.length > 0}
				<div class="comments-block">
					<h2 class="section-label">Activity</h2>
					<ul class="comment-list">
						{#each data.comments as comment (comment.id)}
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

	:global(.topbar-share) {
		border: none !important;
		background: transparent !important;
		color: var(--color-text-secondary) !important;
	}

	:global(.topbar-share:hover) {
		background: var(--color-bg) !important;
		color: var(--color-text) !important;
	}

	.back-btn {
		font-size: var(--text-sm);
		color: var(--color-brand-dark);
		font-weight: var(--weight-medium);
	}

	.topbar-logo {
		font-size: var(--text-lg);
		font-weight: var(--weight-bold);
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

	.item-description {
		line-height: var(--leading-relaxed);
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
