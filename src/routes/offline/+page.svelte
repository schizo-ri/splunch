<svelte:head>
	<title>You're offline — Splunch</title>
</svelte:head>

<div class="layout">
	<div class="content">
		<div class="icon" aria-hidden="true">📵</div>
		<h1 class="title">You're offline</h1>
		<p class="body">
			This page hasn't been cached yet. Open it while online and it will be available offline next time.
		</p>
		<button class="btn" onclick={() => location.reload()}>Try again</button>
	</div>
</div>

<style>
	.layout {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg);
		padding: var(--space-6);
	}

	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		text-align: center;
		max-width: 320px;
	}

	.icon {
		font-size: 3rem;
	}

	.title {
		font-size: var(--text-xl);
		font-weight: var(--weight-bold);
		color: var(--color-text);
	}

	.body {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		line-height: var(--leading-relaxed);
	}

	.btn {
		margin-top: var(--space-2);
		padding: var(--space-2) var(--space-5);
		background: var(--color-brand);
		color: #fff;
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
	}
</style>
