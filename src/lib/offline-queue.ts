import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const CACHE_NAME = 'splunch-photos-v1'
const CACHE_SIZE_LIMIT = 5 * 1024 * 1024 // 5 MB

interface QueuedResolve {
	id: string // crypto.randomUUID()
	token: string
	workerName: string
	note: string | null
	photoBlob: Blob | null // null if stored in Cache Storage
	photoCacheKey: string | null // set when blob went to Cache Storage
	createdAt: number
	syncAttempts: number
}

interface SplunchDB extends DBSchema {
	resolve_queue: {
		key: string
		value: QueuedResolve
	}
}

let _db: IDBPDatabase<SplunchDB> | null = null

async function getDB() {
	if (!_db) {
		_db = await openDB<SplunchDB>('splunch', 1, {
			upgrade(db) {
				db.createObjectStore('resolve_queue', { keyPath: 'id' })
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

export async function getPendingCount(): Promise<number> {
	const db = await getDB()
	return db.count('resolve_queue')
}

export async function getPending(): Promise<QueuedResolve[]> {
	const db = await getDB()
	return db.getAll('resolve_queue')
}

export async function syncQueue(supabaseUrl: string, supabaseAnonKey: string) {
	const pending = await getPending()
	if (pending.length === 0) return { synced: 0, failed: 0 }

	let synced = 0
	let failed = 0

	for (const entry of pending) {
		try {
			const blob = await resolveBlob(entry)
			const fd = new FormData()
			fd.set('worker_name', entry.workerName)
			if (entry.note) fd.set('note', entry.note)
			if (blob) fd.set('photo', blob, 'solution.webp')

			const res = await fetch(`/item/${entry.token}?/resolve`, {
				method: 'POST',
				body: fd
			})

			if (res.ok || res.status === 303) {
				await removeEntry(entry)
				synced++
			} else {
				await bumpAttempts(entry.id)
				failed++
			}
		} catch {
			await bumpAttempts(entry.id)
			failed++
		}
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

async function removeEntry(entry: QueuedResolve) {
	const db = await getDB()
	await db.delete('resolve_queue', entry.id)
	if (entry.photoCacheKey) {
		const cache = await caches.open(CACHE_NAME)
		await cache.delete(entry.photoCacheKey)
	}
}

async function bumpAttempts(id: string) {
	const db = await getDB()
	const entry = await db.get('resolve_queue', id)
	if (entry) await db.put('resolve_queue', { ...entry, syncAttempts: entry.syncAttempts + 1 })
}
