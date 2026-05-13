import { fail } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/server/supabase-admin'
import type { Actions } from './$types'

export const actions: Actions = {
	resolve: async ({ request, params }) => {
		const data = await request.formData()
		const workerName = (data.get('worker_name') as string)?.trim()
		const note = (data.get('note') as string)?.trim() || null
		const photo = data.get('photo') as File | null

		if (!workerName) return fail(400, { action: 'resolve', error: 'Enter your name.' })

		const { data: item } = await supabaseAdmin
			.from('punch_items')
			.select('id, status')
			.eq('share_token', params.token)
			.single()

		if (!item) return fail(404, { action: 'resolve', error: 'Item not found.' })
		if (!['open', 'reopened'].includes(item.status)) {
			return fail(400, { action: 'resolve', error: 'Item is not open for repair.' })
		}

		const inserts: PromiseLike<unknown>[] = [
			supabaseAdmin.from('punch_items').update({ status: 'resolved' }).eq('id', item.id)
		]

		if (photo && photo.size > 0) {
			const ext = photo.name.split('.').pop()?.toLowerCase() ?? 'webp'
			const storagePath = `${item.id}/solution_${Date.now()}.${ext}`
			const buffer = await photo.arrayBuffer()

			const { error: uploadError } = await supabaseAdmin.storage
				.from('punch-photos')
				.upload(storagePath, buffer, { contentType: photo.type, upsert: false })

			if (uploadError) return fail(500, { action: 'resolve', error: 'Error uploading photo.' })

			inserts.push(
				supabaseAdmin.from('photos').insert({
					punch_item_id: item.id,
					type: 'solution',
					storage_path: storagePath,
					created_by_name: workerName
				})
			)
		}

		if (note) {
			inserts.push(
				supabaseAdmin.from('comments').insert({
					punch_item_id: item.id,
					body: note,
					author_name: workerName
				})
			)
		}

		await Promise.all(inserts)

		return { resolveSuccess: true }
	},

	close: async ({ request, params, locals: { safeGetSession } }) => {
		const { user } = await safeGetSession()
		if (!user) return fail(401, { action: 'close', error: 'Not logged in.' })

		const data = await request.formData()
		const note = (data.get('note') as string)?.trim() || null

		const { data: item } = await supabaseAdmin
			.from('punch_items')
			.select('id, project_id')
			.eq('share_token', params.token)
			.single()

		if (!item) return fail(404, { action: 'close', error: 'Item not found.' })

		const { data: membership } = await supabaseAdmin
			.from('project_users')
			.select('role')
			.eq('project_id', item.project_id!)
			.eq('user_id', user.id)
			.single()

		if (!membership || membership.role !== 'owner') {
			return fail(403, { action: 'close', error: 'You do not have permission to close this item.' })
		}

		await Promise.all([
			supabaseAdmin.from('punch_items').update({ status: 'reviewed' }).eq('id', item.id),
			...(note
				? [supabaseAdmin.from('comments').insert({
						punch_item_id: item.id,
						body: note,
						author_name: user.email ?? 'foreman',
						author_user_id: user.id
					})]
				: [])
		])

		return { closeSuccess: true }
	},

	reopen: async ({ request, params, locals: { safeGetSession } }) => {
		const { user } = await safeGetSession()
		if (!user) return fail(401, { action: 'reopen', error: 'Not logged in.' })

		const data = await request.formData()
		const note = (data.get('note') as string)?.trim()

		if (!note) return fail(400, { action: 'reopen', error: 'Please provide a reason for returning the item.' })

		const { data: item } = await supabaseAdmin
			.from('punch_items')
			.select('id, project_id')
			.eq('share_token', params.token)
			.single()

		if (!item) return fail(404, { action: 'reopen', error: 'Item not found.' })

		const { data: membership } = await supabaseAdmin
			.from('project_users')
			.select('role')
			.eq('project_id', item.project_id!)
			.eq('user_id', user.id)
			.single()

		if (!membership || membership.role !== 'owner') {
			return fail(403, { action: 'reopen', error: 'You do not have permission to return this item.' })
		}

		await Promise.all([
			supabaseAdmin.from('punch_items').update({ status: 'reopened' }).eq('id', item.id),
			supabaseAdmin.from('comments').insert({
				punch_item_id: item.id,
				body: note,
				author_name: user.email ?? 'foreman',
				author_user_id: user.id
			})
		])

		return { reopenSuccess: true }
	},

	update_item: async ({ request, params, locals: { safeGetSession } }) => {
		const { user } = await safeGetSession()
		if (!user) return fail(401, { action: 'update_item', error: 'Not logged in.' })

		const data = await request.formData()
		const title = (data.get('title') as string)?.trim()
		const description = (data.get('description') as string)?.trim() || null
		const assigned_to = (data.get('assigned_to') as string)?.trim() || null
		const area_id = (data.get('area_id') as string) || null

		if (!title) return fail(400, { action: 'update_item', error: 'Title is required.' })

		const { data: item } = await supabaseAdmin
			.from('punch_items')
			.select('id, project_id')
			.eq('share_token', params.token)
			.single()

		if (!item) return fail(404, { action: 'update_item', error: 'Item not found.' })

		const { data: membership } = await supabaseAdmin
			.from('project_users')
			.select('role')
			.eq('project_id', item.project_id!)
			.eq('user_id', user.id)
			.single()

		if (!membership) return fail(403, { action: 'update_item', error: 'No access.' })

		await supabaseAdmin
			.from('punch_items')
			.update({ title, description, assigned_to, area_id })
			.eq('id', item.id)

		return { updateItemSuccess: true }
	},

	update_area: async ({ request, params, locals: { safeGetSession } }) => {
		const { user } = await safeGetSession()
		if (!user) return fail(401, { action: 'update_area', error: 'Not logged in.' })

		const data = await request.formData()
		const area_id = (data.get('area_id') as string) || null

		const { data: item } = await supabaseAdmin
			.from('punch_items')
			.select('id, project_id')
			.eq('share_token', params.token)
			.single()

		if (!item) return fail(404, { action: 'update_area', error: 'Item not found.' })

		const { data: membership } = await supabaseAdmin
			.from('project_users')
			.select('role')
			.eq('project_id', item.project_id!)
			.eq('user_id', user.id)
			.single()

		if (!membership) return fail(403, { action: 'update_area', error: 'No access.' })

		await supabaseAdmin.from('punch_items').update({ area_id }).eq('id', item.id)

		return { updateAreaSuccess: true }
	}
}
