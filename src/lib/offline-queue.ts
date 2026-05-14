import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const CACHE_NAME = 'splunch-photos-v1'
const CACHE_SIZE_LIMIT = 5 * 1024 * 1024 // 5 MB

interface QueuedResolve {
	id: string
	token: string
	workerName: string
	note: string | null
	photoBlob: Blob | null
	photoCacheKey: string | null
	createdAt: number
	syncAttempts: number
}

interface QueuedClose {
	id: string
	token: string
	note: string | null
	createdAt: number
	syncAttempts: number
}

interface QueuedReopen {
	id: string
	token: string
	note: string
	createdAt: number
	syncAttempts: number
}

interface SplunchDB extends DBSchema {
	resolve_queue: { key: string; value: QueuedResolve }
	close_queue: { key: string; value: QueuedClose }
	reopen_queue: { key: string; value: QueuedReopen }
}

let _db: IDBPDatabase<SplunchDB> | null = null
let _syncing = false

async function getDB() {
	if (!_db) {
		_db = await openDB<SplunchDB>('splunch', 2, {
			upgrade(db, oldVersion) {
				if (oldVersion < 1) {
					db.createObjectStore('resolve_queue', { keyPath: 'id' })
				}
				if (oldVersion < 2) {
					db.createObjectStore('close_queue', { keyPath: 'id' })
					db.createObjectStore('reopen_queue', { keyPath: 'id' })
				}
			}
		})
	}
	return _db
}

export async function enqueueResolve(
	token: string,
	workerName: string,
	note: string | null,
	photoBlob: Blob | null
) {
	const db = await getDB()
	const id = crypto.randomUUID()
	let blobToStore: Blob | null = photoBlob
	let cacheKey: string | null = null

	if (photoBlob && photoBlob.size >= CACHE_SIZE_LIMIT) {
		cacheKey = `splunch-photo-${id}`
		const cache = await caches.open(CACHE_NAME)
		await cache.put(cacheKey, new Response(photoBlob, { headers: { 'Content-Type': photoBlob.type } }))
		blobToStore = null
	}

	await db.add('resolve_queue', {
		id,
		token,
		workerName,
		note,
		photoBlob: blobToStore,
		photoCacheKey: cacheKey,
		createdAt: Date.now(),
		syncAttempts: 0
	})

	return id
}

export async function enqueueClose(token: string, note: string | null) {
	const db = await getDB()
	const id = crypto.randomUUID()
	await db.add('close_queue', { id, token, note, createdAt: Date.now(), syncAttempts: 0 })
	return id
}

export async function enqueueReopen(token: string, note: string) {
	const db = await getDB()
	const id = crypto.randomUUID()
	await db.add('reopen_queue', { id, token, note, createdAt: Date.now(), syncAttempts: 0 })
	return id
}

export async function getPendingCount(): Promise<number> {
	const db = await getDB()
	const [r, c, re] = await Promise.all([
		db.count('resolve_queue'),
		db.count('close_queue'),
		db.count('reopen_queue')
	])
	return r + c + re
}

export async function syncQueue() {
	if (_syncing) return { synced: 0, failed: 0 }
	_syncing = true
	const db = await getDB()
	let synced = 0
	let failed = 0

	try {
		// sync resolve queue
		const resolves = await db.getAll('resolve_queue')
		for (const entry of resolves) {
			try {
				const blob = await resolveBlob(entry)
				const fd = new FormData()
				fd.set('worker_name', entry.workerName)
				if (entry.note) fd.set('note', entry.note)
				if (blob) fd.set('photo', blob, 'solution.webp')

				const res = await fetch(`/item/${entry.token}?/resolve`, { method: 'POST', body: fd })
				if (res.ok || res.status === 303) {
					await db.delete('resolve_queue', entry.id)
					if (entry.photoCacheKey) {
						const cache = await caches.open(CACHE_NAME)
						await cache.delete(entry.photoCacheKey)
					}
					synced++
				} else {
					await db.put('resolve_queue', { ...entry, syncAttempts: entry.syncAttempts + 1 })
					failed++
				}
			} catch {
				await db.put('resolve_queue', { ...entry, syncAttempts: entry.syncAttempts + 1 })
				failed++
			}
		}

		// sync close queue
		const closes = await db.getAll('close_queue')
		for (const entry of closes) {
			try {
				const fd = new FormData()
				if (entry.note) fd.set('note', entry.note)

				const res = await fetch(`/item/${entry.token}?/close`, { method: 'POST', body: fd })
				if (res.ok || res.status === 303) {
					await db.delete('close_queue', entry.id)
					synced++
				} else {
					await db.put('close_queue', { ...entry, syncAttempts: entry.syncAttempts + 1 })
					failed++
				}
			} catch {
				await db.put('close_queue', { ...entry, syncAttempts: entry.syncAttempts + 1 })
				failed++
			}
		}

		// sync reopen queue
		const reopens = await db.getAll('reopen_queue')
		for (const entry of reopens) {
			try {
				const fd = new FormData()
				fd.set('note', entry.note)

				const res = await fetch(`/item/${entry.token}?/reopen`, { method: 'POST', body: fd })
				if (res.ok || res.status === 303) {
					await db.delete('reopen_queue', entry.id)
					synced++
				} else {
					await db.put('reopen_queue', { ...entry, syncAttempts: entry.syncAttempts + 1 })
					failed++
				}
			} catch {
				await db.put('reopen_queue', { ...entry, syncAttempts: entry.syncAttempts + 1 })
				failed++
			}
		}
	} finally {
		_syncing = false
	}

	return { synced, failed }
}

async function resolveBlob(entry: QueuedResolve): Promise<Blob | null> {
	if (entry.photoBlob) return entry.photoBlob
	if (entry.photoCacheKey) {
		const cache = await caches.open(CACHE_NAME)
		const res = await cache.match(entry.photoCacheKey)
		return res ? res.blob() : null
	}
	return null
}
