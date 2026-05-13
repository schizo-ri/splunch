const MAX_PX = 1920
const QUALITY = 0.82

export async function compressImage(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file)

	const scale = Math.min(1, MAX_PX / Math.max(bitmap.width, bitmap.height))
	const w = Math.round(bitmap.width * scale)
	const h = Math.round(bitmap.height * scale)

	const canvas = new OffscreenCanvas(w, h)
	const ctx = canvas.getContext('2d')!
	ctx.drawImage(bitmap, 0, 0, w, h)
	bitmap.close()

	return canvas.convertToBlob({ type: 'image/webp', quality: QUALITY })
}
