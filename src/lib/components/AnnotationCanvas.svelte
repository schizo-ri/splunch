<script lang="ts">
	import type { Annotation } from '$lib/types/database';

	let { src, onchange }: { src: string; onchange: (a: Annotation[]) => void } = $props();

	let imgEl = $state<HTMLImageElement>();
	let canvas = $state<HTMLCanvasElement>();
	let tool = $state<'circle' | 'arrow'>('circle');
	let annotations = $state<Annotation[]>([]);
	let drawing = false;
	let startX = 0;
	let startY = 0;

	function getCtx() {
		return canvas!.getContext('2d')!;
	}

	function syncCanvasSize() {
		if (!canvas || !imgEl) return;
		canvas.width = imgEl.offsetWidth;
		canvas.height = imgEl.offsetHeight;
	}

	function toNorm(px: number, py: number) {
		return { x: px / canvas!.width, y: py / canvas!.height };
	}

	function pointerPos(e: PointerEvent) {
		const rect = canvas!.getBoundingClientRect();
		return {
			px: e.clientX - rect.left,
			py: e.clientY - rect.top
		};
	}

	function drawAll(ctx: CanvasRenderingContext2D, preview?: Annotation) {
		ctx.clearRect(0, 0, canvas!.width, canvas!.height);
		for (const ann of [...annotations, ...(preview ? [preview] : [])]) {
			drawAnnotation(ctx, ann);
		}
	}

	function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation) {
		const W = canvas!.width;
		const H = canvas!.height;
		ctx.lineWidth = 3;
		ctx.lineCap = 'round';

		if (ann.type === 'circle') {
			const cx = ann.x * W;
			const cy = ann.y * H;
			const rx = ann.rx * W;
			const ry = ann.ry * H;
			// White outline for visibility on dark backgrounds
			ctx.strokeStyle = '#fff';
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
			ctx.stroke();
			ctx.strokeStyle = '#ef4444';
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
			ctx.stroke();
		} else {
			const x1 = ann.x * W;
			const y1 = ann.y * H;
			const x2 = ann.x2 * W;
			const y2 = ann.y2 * H;
			const angle = Math.atan2(y2 - y1, x2 - x1);
			const headLen = 14;

			// White outline
			ctx.strokeStyle = '#fff';
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();

			// Red line
			ctx.strokeStyle = '#ef4444';
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();

			// Arrowhead
			ctx.fillStyle = '#ef4444';
			ctx.beginPath();
			ctx.moveTo(x2, y2);
			ctx.lineTo(
				x2 - headLen * Math.cos(angle - Math.PI / 6),
				y2 - headLen * Math.sin(angle - Math.PI / 6)
			);
			ctx.lineTo(
				x2 - headLen * Math.cos(angle + Math.PI / 6),
				y2 - headLen * Math.sin(angle + Math.PI / 6)
			);
			ctx.closePath();
			ctx.fill();
		}
	}

	function onPointerDown(e: PointerEvent) {
		e.preventDefault();
		syncCanvasSize();
		const { px, py } = pointerPos(e);
		startX = px;
		startY = py;
		drawing = true;
		canvas!.setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!drawing) return;
		const { px, py } = pointerPos(e);
		const ctx = getCtx();
		const W = canvas!.width;
		const H = canvas!.height;

		let preview: Annotation;
		if (tool === 'circle') {
			const dx = px - startX;
			const dy = py - startY;
			const r = Math.sqrt(dx * dx + dy * dy);
			preview = { type: 'circle', x: startX / W, y: startY / H, rx: r / W, ry: r / H };
		} else {
			preview = { type: 'arrow', x: startX / W, y: startY / H, x2: px / W, y2: py / H };
		}
		drawAll(ctx, preview);
	}

	function onPointerUp(e: PointerEvent) {
		if (!drawing) return;
		drawing = false;
		const { px, py } = pointerPos(e);
		const W = canvas!.width;
		const H = canvas!.height;
		const dx = px - startX;
		const dy = py - startY;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < 5) return; // too small, ignore tap

		let ann: Annotation;
		if (tool === 'circle') {
			ann = { type: 'circle', x: startX / W, y: startY / H, rx: dist / W, ry: dist / H };
		} else {
			ann = { type: 'arrow', x: startX / W, y: startY / H, x2: px / W, y2: py / H };
		}
		annotations = [...annotations, ann];
		drawAll(getCtx());
		onchange(annotations);
	}

	function undo() {
		annotations = annotations.slice(0, -1);
		drawAll(getCtx());
		onchange(annotations);
	}

	function clear() {
		annotations = [];
		getCtx().clearRect(0, 0, canvas!.width, canvas!.height);
		onchange(annotations);
	}
</script>

<div class="wrap">
	<div class="stage">
		<img
			bind:this={imgEl}
			{src}
			alt="Fotografija za anotaciju"
			class="img"
			onload={syncCanvasSize}
		/>
		<canvas
			bind:this={canvas}
			class="canvas"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
		></canvas>
	</div>

	<div class="toolbar">
		<div class="tools">
			<button
				type="button"
				class="tool-btn"
				class:active={tool === 'circle'}
				onclick={() => (tool = 'circle')}
			>
				<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
					<circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="2"/>
				</svg>
				Krug
			</button>
			<button
				type="button"
				class="tool-btn"
				class:active={tool === 'arrow'}
				onclick={() => (tool = 'arrow')}
			>
				<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
					<path d="M3 15L15 3M15 3H8M15 3V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				Strelica
			</button>
		</div>
		<div class="actions">
			<button type="button" class="action-btn" onclick={undo} disabled={annotations.length === 0}>
				Poništi
			</button>
			<button type="button" class="action-btn" onclick={clear} disabled={annotations.length === 0}>
				Očisti sve
			</button>
		</div>
	</div>
</div>

<style>
	.wrap {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.stage {
		position: relative;
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: #000;
		touch-action: none;
	}

	.img {
		display: block;
		width: 100%;
		height: auto;
		user-select: none;
		-webkit-user-drag: none;
	}

	.canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		cursor: crosshair;
		touch-action: none;
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.tools {
		display: flex;
		gap: var(--space-2);
	}

	.tool-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-3);
		min-height: 2.25rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.tool-btn.active {
		border-color: var(--color-open);
		background: var(--color-open-bg);
		color: var(--color-open-fg);
	}

	.actions {
		display: flex;
		gap: var(--space-2);
	}

	.action-btn {
		padding: var(--space-1) var(--space-2);
		min-height: 2.25rem;
		border: none;
		background: none;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: color var(--transition-fast);
	}

	.action-btn:hover:not(:disabled) {
		color: var(--color-text);
	}

	.action-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
