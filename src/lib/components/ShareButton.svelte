<script lang="ts">
	let {
		url,
		title,
		iconOnly = false,
		class: klass = ''
	}: { url: string; title: string; iconOnly?: boolean; class?: string } = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	async function share() {
		if (navigator.share) {
			try {
				await navigator.share({ url, title });
				return;
			} catch (err) {
				if (err instanceof DOMException && err.name === 'AbortError') return;
				// share failed for other reasons (e.g. no targets on desktop) — fall through to clipboard
			}
		}

		await navigator.clipboard.writeText(url);
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 2000);
	}
</script>

<button
	class="share-btn {klass}"
	class:icon-only={iconOnly}
	onclick={share}
	type="button"
	aria-label="Podijeli link"
>
	{#if copied}
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path d="M4 12l5 5L20 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
		{#if !iconOnly}Kopirano{/if}
	{:else}
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path fill-rule="evenodd" clip-rule="evenodd" d="M14.25 5.5C14.25 3.70507 15.7051 2.25 17.5 2.25C19.2949 2.25 20.75 3.70507 20.75 5.5C20.75 7.29491 19.2949 8.75 17.5 8.75C15.7051 8.75 14.25 7.29491 14.25 5.5ZM17.5 3.75C16.5335 3.75 15.75 4.53351 15.75 5.5C15.75 6.46649 16.5335 7.25 17.5 7.25C18.4665 7.25 19.25 6.46649 19.25 5.5C19.25 4.53351 18.4665 3.75 17.5 3.75Z" fill="currentColor"/>
			<path fill-rule="evenodd" clip-rule="evenodd" d="M3.25 12C3.25 10.2051 4.70509 8.75 6.5 8.75C8.29491 8.75 9.75 10.2051 9.75 12C9.75 13.7949 8.29491 15.25 6.5 15.25C4.70509 15.25 3.25 13.7949 3.25 12ZM6.5 10.25C5.53351 10.25 4.75 11.0335 4.75 12C4.75 12.9665 5.53351 13.75 6.5 13.75C7.46649 13.75 8.25 12.9665 8.25 12C8.25 11.0335 7.46649 10.25 6.5 10.25Z" fill="currentColor"/>
			<path fill-rule="evenodd" clip-rule="evenodd" d="M15.6415 6.39859C15.8562 6.75285 15.743 7.21404 15.3887 7.42867L9.05818 11.2641C8.70391 11.4788 8.24273 11.3656 8.02809 11.0113C7.81345 10.657 7.92664 10.1959 8.28091 9.98122L14.6115 6.14577C14.9657 5.93113 15.4269 6.04432 15.6415 6.39859Z" fill="currentColor"/>
			<path fill-rule="evenodd" clip-rule="evenodd" d="M8.02386 12.9004C8.23458 12.5438 8.69449 12.4256 9.0511 12.6363L15.7213 16.5778C16.0779 16.7885 16.1962 17.2484 15.9854 17.605C15.7747 17.9616 15.3148 18.0799 14.9582 17.8692L8.288 13.9277C7.9314 13.7169 7.81313 13.257 8.02386 12.9004Z" fill="currentColor"/>
			<path fill-rule="evenodd" clip-rule="evenodd" d="M17.5 16.75C16.5335 16.75 15.75 17.5335 15.75 18.5C15.75 19.4665 16.5335 20.25 17.5 20.25C18.4665 20.25 19.25 19.4665 19.25 18.5C19.25 17.5335 18.4665 16.75 17.5 16.75ZM14.25 18.5C14.25 16.7051 15.7051 15.25 17.5 15.25C19.2949 15.25 20.75 16.7051 20.75 18.5C20.75 20.2949 19.2949 21.75 17.5 21.75C15.7051 21.75 14.25 20.2949 14.25 18.5Z" fill="currentColor"/>
		</svg>
		{#if !iconOnly}Pošalji{/if}
	{/if}
</button>

<style>
	.share-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		min-height: var(--touch-target);
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
		transition: background-color var(--transition-fast), color var(--transition-fast);
		-webkit-tap-highlight-color: transparent;
		white-space: nowrap;
	}

	.share-btn:hover {
		background: var(--color-bg);
	}

	.icon-only {
		min-height: 2rem;
		width: 2rem;
		padding: 0;
		justify-content: center;
		border-radius: var(--radius-md);
	}
</style>
