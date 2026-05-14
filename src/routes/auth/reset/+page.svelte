<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { supabase } = $derived(data);

	let mode = $state<'loading' | 'form' | 'success' | 'invalid'>('loading');
	let password = $state('');
	let confirm = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

	onMount(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event) => {
			if (event === 'PASSWORD_RECOVERY') {
				mode = 'form';
			}
		});

		const timeout = setTimeout(() => {
			if (mode === 'loading') mode = 'invalid';
		}, 4000);

		return () => {
			subscription.unsubscribe();
			clearTimeout(timeout);
		};
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		errorMsg = '';

		if (password.length < 8) {
			errorMsg = 'Password must be at least 8 characters.';
			return;
		}
		if (password !== confirm) {
			errorMsg = 'Passwords do not match.';
			return;
		}

		loading = true;
		const { error } = await supabase.auth.updateUser({ password });

		if (error) {
			errorMsg = error.message;
			loading = false;
		} else {
			mode = 'success';
			setTimeout(() => goto('/dashboard'), 2000);
		}
	}
</script>

<svelte:head>
	<title>Reset password — Splunch</title>
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
		</header>

		<main>
			{#if mode === 'loading'}
				<div class="card state-card">
					<span class="spinner spinner-lg"></span>
					<p class="state-text">Verifying reset link…</p>
				</div>
			{:else if mode === 'invalid'}
				<div class="card state-card">
					<p class="state-text error-text">This reset link is invalid or has expired.</p>
					<a class="btn btn-primary btn-full" href="/login">Back to sign in</a>
				</div>
			{:else if mode === 'success'}
				<div class="card state-card">
					<p class="state-text success-text">Password updated. Redirecting…</p>
				</div>
			{:else}
				<form onsubmit={handleSubmit} class="reset-form">
					<h1 class="form-title">Set new password</h1>

					{#if errorMsg}
						<div class="error-banner" role="alert">{errorMsg}</div>
					{/if}

					<div class="field">
						<label class="label" for="password">New password</label>
						<input
							class="input"
							type="password"
							id="password"
							name="password"
							autocomplete="new-password"
							minlength="8"
							required
							bind:value={password}
							disabled={loading}
						/>
					</div>

					<div class="field">
						<label class="label" for="confirm">Confirm password</label>
						<input
							class="input"
							type="password"
							id="confirm"
							name="confirm"
							autocomplete="new-password"
							minlength="8"
							required
							bind:value={confirm}
							disabled={loading}
						/>
					</div>

					<button class="btn btn-primary btn-full" type="submit" disabled={loading}>
						{#if loading}
							<span class="spinner"></span>
						{/if}
						Update password
					</button>
				</form>
			{/if}
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
	}

	.logo-name {
		font-size: var(--text-2xl);
		font-weight: var(--weight-bold);
		color: var(--color-text);
		letter-spacing: -0.02em;
	}

	.reset-form {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--space-6);
		box-shadow: var(--shadow-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-title {
		font-size: var(--text-lg);
		font-weight: var(--weight-semibold);
		margin: 0;
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

	.state-card {
		padding: var(--space-8) var(--space-6);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		text-align: center;
	}

	.state-text {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.error-text {
		color: var(--color-open-fg);
	}

	.success-text {
		color: var(--color-resolved-fg);
	}

	.spinner-lg {
		width: 1.5rem;
		height: 1.5rem;
	}
</style>
