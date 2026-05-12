<script lang="ts">
	import type { Annotation, Json } from '$lib/types/database';

	let { src, annotations, alt = 'Photo' }: {
		src: string;
		annotations: Json | null;
		alt?: string;
	} = $props();

	const anns = $derived(() => {
		if (!Array.isArray(annotations)) return [];
		return annotations as unknown as Annotation[];
	});

	function arrowPoints(ann: Extract<Annotation, { type: 'arrow' }>) {
		const headLen = 0.04; // fraction of viewBox
		const angle = Math.atan2(ann.y2 - ann.y, ann.x2 - ann.x);
		return {
			x1: ann.x, y1: ann.y, x2: ann.x2, y2: ann.y2,
			hx1: ann.x2 - headLen * Math.cos(angle - Math.PI / 6),
			hy1: ann.y2 - headLen * Math.sin(angle - Math.PI / 6),
			hx2: ann.x2 - headLen * Math.cos(angle + Math.PI / 6),
			hy2: ann.y2 - headLen * Math.sin(angle + Math.PI / 6)
		};
	}
</script>

<div class="wrap">
	<img {src} {alt} class="img" />
	{#if anns().length > 0}
		<svg
			class="overlay"
			viewBox="0 0 1 1"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			{#each anns() as ann (JSON.stringify(ann))}
				{#if ann.type === 'circle'}
					<ellipse
						cx={ann.x} cy={ann.y}
						rx={ann.rx} ry={ann.ry}
						fill="none"
						stroke="white" stroke-width="0.008"
					/>
					<ellipse
						cx={ann.x} cy={ann.y}
						rx={ann.rx} ry={ann.ry}
						fill="none"
						stroke="#ef4444" stroke-width="0.005"
					/>
				{:else if ann.type === 'arrow'}
					{@const p = arrowPoints(ann)}
					<line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
						stroke="white" stroke-width="0.008" stroke-linecap="round"/>
					<line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
						stroke="#ef4444" stroke-width="0.005" stroke-linecap="round"/>
					<polygon
						points="{p.x2},{p.y2} {p.hx1},{p.hy1} {p.hx2},{p.hy2}"
						fill="#ef4444"
					/>
				{/if}
			{/each}
		</svg>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
		display: block;
	}

	.img {
		display: block;
		width: 100%;
		height: auto;
	}

	.overlay {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
</style>
