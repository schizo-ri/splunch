<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Sign in — Splunch</title>
</svelte:head>

<div class="page">
	<div class="container">
		<header class="header">
			<div class="logo">
				<svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
					<rect width="40" height="40" rx="10" fill="var(--color-brand)" />
					<rect x="10" y="12" width="20" height="3" rx="1.5" fill="var(--color-brand-fg)" />
					<rect x="10" y="19" width="14" height="3" rx="1.5" fill="var(--color-brand-fg)" />
					<rect x="10" y="26" width="17" height="3" rx="1.5" fill="var(--color-brand-fg)" />
				</svg>
				<span class="logo-name">Splunch</span>
			</div>
			<p class="subtitle">Punch list for construction sites</p>
		</header>

		<main>
			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
			>
				{#if form?.error}
					<div class="error-banner" role="alert">
						{form.error}
					</div>
				{/if}

				<div class="field">
					<label class="label" for="email">Email</label>
					<input
						class="input"
						type="email"
						id="email"
						name="email"
						autocomplete="email"
						autocapitalize="none"
						required
						disabled={loading}
					/>
				</div>

				<div class="field">
					<label class="label" for="password">Password</label>
					<input
						class="input"
						type="password"
						id="password"
						name="password"
						autocomplete="current-password"
						required
						disabled={loading}
					/>
				</div>

				<button class="btn btn-primary btn-full submit" type="submit" disabled={loading}>
					{#if loading}
						<span class="spinner"></span>
					{/if}
					Sign in
				</button>
			</form>

			<p class="register-note">
				Foreman accounts are created by the administrator.<br />
				Workers don't need an account.
			</p>
		</main>
	</div>
</div>

<style>
	.page {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-6) var(--space-4);
		background-color: var(--color-bg);
	}

	.container {
		width: 100%;
		max-width: 400px;
	}

	.header {
		text-align: center;
		margin-bottom: var(--space-8);
	}

	.logo {
		display: inline-flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	.logo-name {
		font-size: var(--text-2xl);
		font-weight: var(--weight-bold);
		color: var(--color-text);
		letter-spacing: -0.02em;
	}

	.subtitle {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	form {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--space-6);
		box-shadow: var(--shadow-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
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

	.submit {
		margin-top: var(--space-2);
	}

	.register-note {
		margin-top: var(--space-6);
		text-align: center;
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		line-height: var(--leading-relaxed);
	}
</style>
