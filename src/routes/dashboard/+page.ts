export const ssr = false

import { redirect } from '@sveltejs/kit'
import type { ProjectRole } from '$lib/types/database'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent }) => {
	const { supabase, user } = await parent()
	if (!user) redirect(303, '/login')

	const [{ data: projects }, { data: myRoles }, { data: profile }] = await Promise.all([
		supabase
			.from('projects')
			.select('id, name, address, created_at')
			.order('created_at', { ascending: false }),
		supabase.from('project_users').select('project_id, role').eq('user_id', user.id),
		supabase.from('profiles').select('is_superadmin').eq('id', user.id).single()
	])

	const roleMap = new Map(myRoles?.map((r) => [r.project_id, r.role as ProjectRole]) ?? [])

	return {
		user,
		isSuperadmin: profile?.is_superadmin ?? false,
		projects: (projects ?? []).map((p) => ({
			...p,
			role: roleMap.get(p.id) ?? ('member' as ProjectRole)
		}))
	}
}
