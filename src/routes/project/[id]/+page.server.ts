import { error, fail, redirect } from '@sveltejs/kit'
import type { ProjectRole } from '$lib/types/database'
import type { Actions, PageServerLoad } from './$types'
import { supabaseAdmin } from '$lib/server/supabase-admin'

export const load: PageServerLoad = async ({ params, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession()
	if (!user) redirect(303, '/login')

	const [
		{ data: project },
		{ data: items },
		{ data: areas },
		{ data: myMembership },
		{ data: areaTemplates }
	] = await Promise.all([
		supabase.from('projects').select('id, name, address').eq('id', params.id).single(),
		supabase
			.from('punch_items')
			.select('id, title, status, assigned_to, share_token, created_at, area_id')
			.eq('project_id', params.id)
			.order('created_at', { ascending: false }),
		supabase
			.from('areas')
			.select('id, name, sort_order, archived_at')
			.eq('project_id', params.id)
			.order('sort_order')
			.order('name'),
		supabase
			.from('project_users')
			.select('role')
			.eq('project_id', params.id)
			.eq('user_id', user.id)
			.single(),
		supabase.from('area_templates').select('id, name').order('sort_order')
	])

	if (!project) error(404, 'Project not found.')

	return {
		project,
		items: items ?? [],
		areas: (areas ?? []).filter((a) => !a.archived_at),
		archivedAreas: (areas ?? []).filter((a) => !!a.archived_at),
		userRole: (myMembership?.role ?? 'member') as ProjectRole,
		areaTemplates: areaTemplates ?? []
	}
}

export const actions: Actions = {
	create: async ({ request, params, locals: { safeGetSession } }) => {
		const { user } = await safeGetSession()
		if (!user) redirect(303, '/login')

		const data = await request.formData()
		const title = (data.get('title') as string)?.trim()
		const description = (data.get('description') as string)?.trim() || null
		const assigned_to = (data.get('assigned_to') as string)?.trim() || null
		const area_id = (data.get('area_id') as string) || null
		const photo = data.get('photo') as File | null
		const annotationsRaw = data.get('annotations') as string | null
		const annotations = annotationsRaw ? JSON.parse(annotationsRaw) : []

		if (!title) return fail(400, { action: 'create', error: 'Title is required.' })
		if (!photo || photo.size === 0) return fail(400, { action: 'create', error: 'Problem photo is required.' })

		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
		if (!allowedTypes.includes(photo.type) && !photo.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)) {
			return fail(400, { action: 'create', error: 'Supported formats: JPG, PNG, WebP, HEIC.' })
		}

		const { data: item, error: itemError } = await supabaseAdmin
			.from('punch_items')
			.insert({ title, description, assigned_to, area_id, project_id: params.id, created_by: user.id })
			.select('id, share_token')
			.single()

		if (itemError || !item) return fail(500, { action: 'create', error: 'Error creating item.' })

		const ext = photo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
		const storagePath = `${item.id}/problem.${ext}`
		const buffer = await photo.arrayBuffer()

		const { error: uploadError } = await supabaseAdmin.storage
			.from('punch-photos')
			.upload(storagePath, buffer, { contentType: photo.type, upsert: false })

		if (uploadError) {
			await supabaseAdmin.from('punch_items').delete().eq('id', item.id)
			return fail(500, { action: 'create', error: 'Error uploading photo.' })
		}

		await supabaseAdmin.from('photos').insert({
			punch_item_id: item.id,
			type: 'problem',
			storage_path: storagePath,
			annotations,
			created_by_name: user.email ?? 'foreman'
		})

		return { success: true }
	},

	create_area: async ({ request, params, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession()
		if (!user) redirect(303, '/login')

		const data = await request.formData()
		const name = (data.get('name') as string)?.trim()

		if (!name) return fail(400, { action: 'create_area', error: 'Area name is required.' })

		const { error: areaError } = await supabase
			.from('areas')
			.insert({ name, project_id: params.id, created_by: user.id })

		if (areaError) return fail(500, { action: 'create_area', error: 'Error creating area.' })

		return { areaSuccess: true }
	},

	archive_area: async ({ request, locals: { safeGetSession } }) => {
		const { user } = await safeGetSession()
		if (!user) redirect(303, '/login')

		const data = await request.formData()
		const id = data.get('id') as string

		await supabaseAdmin
			.from('areas')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', id)

		return { archiveAreaSuccess: true }
	},

	unarchive_area: async ({ request, locals: { safeGetSession } }) => {
		const { user } = await safeGetSession()
		if (!user) redirect(303, '/login')

		const data = await request.formData()
		const id = data.get('id') as string

		await supabaseAdmin.from('areas').update({ archived_at: null }).eq('id', id)

		return { unarchiveAreaSuccess: true }
	},

	delete_area: async ({ request, locals: { safeGetSession } }) => {
		const { user } = await safeGetSession()
		if (!user) redirect(303, '/login')

		const data = await request.formData()
		const id = data.get('id') as string

		await supabaseAdmin.from('areas').delete().eq('id', id)

		return { deleteAreaSuccess: true }
	}
}
