import { error, fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { supabaseAdmin } from '$lib/server/supabase-admin'

export const load: PageServerLoad = async ({ params, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession()
	if (!user) redirect(303, '/login')

	const { data: project } = await supabase
		.from('projects')
		.select('id, name, address')
		.eq('id', params.id)
		.eq('owner_id', user.id)
		.single()

	if (!project) error(404, 'Project not found.')

	const { data: items } = await supabase
		.from('punch_items')
		.select('id, title, status, assigned_to, share_token, created_at')
		.eq('project_id', params.id)
		.order('created_at', { ascending: false })

	return { project, items: items ?? [] }
}

export const actions: Actions = {
	create: async ({ request, params, locals: { safeGetSession } }) => {
		const { user } = await safeGetSession()
		if (!user) redirect(303, '/login')

		const data = await request.formData()
		const title = (data.get('title') as string)?.trim()
		const description = (data.get('description') as string)?.trim() || null
		const assigned_to = (data.get('assigned_to') as string)?.trim() || null
		const photo = data.get('photo') as File | null
		const annotationsRaw = data.get('annotations') as string | null
		const annotations = annotationsRaw ? JSON.parse(annotationsRaw) : []

		if (!title) return fail(400, { error: 'Title is required.' })
		if (!photo || photo.size === 0) return fail(400, { error: 'Problem photo is required.' })

		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
		if (!allowedTypes.includes(photo.type) && !photo.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)) {
			return fail(400, { error: 'Supported formats: JPG, PNG, WebP, HEIC.' })
		}

		// 1. Create punch item
		const { data: item, error: itemError } = await supabaseAdmin
			.from('punch_items')
			.insert({ title, description, assigned_to, project_id: params.id, created_by: user.id })
			.select('id, share_token')
			.single()

		if (itemError || !item) return fail(500, { error: 'Error creating item.' })

		// 2. Upload photo
		const ext = photo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
		const storagePath = `${item.id}/problem.${ext}`
		const buffer = await photo.arrayBuffer()

		const { error: uploadError } = await supabaseAdmin.storage
			.from('punch-photos')
			.upload(storagePath, buffer, { contentType: photo.type, upsert: false })

		if (uploadError) {
			await supabaseAdmin.from('punch_items').delete().eq('id', item.id)
			return fail(500, { error: 'Error uploading photo.' })
		}

		// 3. Save photo record
		await supabaseAdmin.from('photos').insert({
			punch_item_id: item.id,
			type: 'problem',
			storage_path: storagePath,
			annotations,
			created_by_name: user.email ?? 'foreman'
		})

		return { success: true }
	}
}
