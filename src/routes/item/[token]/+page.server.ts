import { error, fail } from '@sveltejs/kit'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { supabaseAdmin } from '$lib/server/supabase-admin'
import type { Actions, PageServerLoad } from './$types'

function photoUrl(path: string) {
	return `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/punch-photos/${path}`
}

export const load: PageServerLoad = async ({ params, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession()

	const { data: item } = await supabase
		.from('punch_items')
		.select('*, projects(name)')
		.eq('share_token', params.token)
		.single()

	if (!item) error(404, 'Stavka nije pronađena.')

	const [{ data: photos }, { data: comments }] = await Promise.all([
		supabase.from('photos').select('*').eq('punch_item_id', item.id).order('created_at'),
		supabase.from('comments').select('*').eq('punch_item_id', item.id).order('created_at')
	])

	return {
		item,
		photos: (photos ?? []).map((p) => ({ ...p, url: photoUrl(p.storage_path) })),
		comments: comments ?? [],
		isOwner: !!user && user.id === item.created_by
	}
}

export const actions: Actions = {
	resolve: async ({ request, params }) => {
		const data = await request.formData()
		const workerName = (data.get('worker_name') as string)?.trim()
		const note = (data.get('note') as string)?.trim() || null
		const photo = data.get('photo') as File | null

		if (!workerName) return fail(400, { action: 'resolve', error: 'Upiši svoje ime.' })
		if (!photo || photo.size === 0) return fail(400, { action: 'resolve', error: 'Fotografija rješenja je obavezna.' })

		const { data: item } = await supabaseAdmin
			.from('punch_items')
			.select('id, status')
			.eq('share_token', params.token)
			.single()

		if (!item) return fail(404, { action: 'resolve', error: 'Stavka nije pronađena.' })
		if (!['open', 'reopened'].includes(item.status)) {
			return fail(400, { action: 'resolve', error: 'Stavka nije otvorena za popravak.' })
		}

		const ext = photo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
		const storagePath = `${item.id}/solution_${Date.now()}.${ext}`
		const buffer = await photo.arrayBuffer()

		const { error: uploadError } = await supabaseAdmin.storage
			.from('punch-photos')
			.upload(storagePath, buffer, { contentType: photo.type, upsert: false })

		if (uploadError) return fail(500, { action: 'resolve', error: 'Greška pri uploadu fotografije.' })

		await Promise.all([
			supabaseAdmin.from('photos').insert({
				punch_item_id: item.id,
				type: 'solution',
				storage_path: storagePath,
				created_by_name: workerName
			}),
			supabaseAdmin
				.from('punch_items')
				.update({ status: 'resolved' })
				.eq('id', item.id),
			...(note
				? [supabaseAdmin.from('comments').insert({
						punch_item_id: item.id,
						body: note,
						author_name: workerName
					})]
				: [])
		])

		return { resolveSuccess: true }
	},

	close: async ({ request, params, locals: { safeGetSession } }) => {
		const { user } = await safeGetSession()
		if (!user) return fail(401, { action: 'close', error: 'Nisi prijavljen.' })

		const data = await request.formData()
		const note = (data.get('note') as string)?.trim() || null

		const { data: item } = await supabaseAdmin
			.from('punch_items')
			.select('id, created_by')
			.eq('share_token', params.token)
			.single()

		if (!item || item.created_by !== user.id) {
			return fail(403, { action: 'close', error: 'Nemate pravo zatvoriti ovu stavku.' })
		}

		await Promise.all([
			supabaseAdmin.from('punch_items').update({ status: 'reviewed' }).eq('id', item.id),
			...(note
				? [supabaseAdmin.from('comments').insert({
						punch_item_id: item.id,
						body: note,
						author_name: user.email ?? 'voditelj',
						author_user_id: user.id
					})]
				: [])
		])

		return { closeSuccess: true }
	},

	reopen: async ({ request, params, locals: { safeGetSession } }) => {
		const { user } = await safeGetSession()
		if (!user) return fail(401, { action: 'reopen', error: 'Nisi prijavljen.' })

		const data = await request.formData()
		const note = (data.get('note') as string)?.trim()

		if (!note) return fail(400, { action: 'reopen', error: 'Navedi razlog vraćanja na popravak.' })

		const { data: item } = await supabaseAdmin
			.from('punch_items')
			.select('id, created_by')
			.eq('share_token', params.token)
			.single()

		if (!item || item.created_by !== user.id) {
			return fail(403, { action: 'reopen', error: 'Nemate pravo vratiti ovu stavku.' })
		}

		await Promise.all([
			supabaseAdmin.from('punch_items').update({ status: 'reopened' }).eq('id', item.id),
			supabaseAdmin.from('comments').insert({
				punch_item_id: item.id,
				body: note,
				author_name: user.email ?? 'voditelj',
				author_user_id: user.id
			})
		])

		return { reopenSuccess: true }
	}
}
