export const ssr = false

import { error, redirect } from '@sveltejs/kit'
import type { ProjectRole } from '$lib/types/database'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, parent }) => {
	const { supabase, user } = await parent()
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
