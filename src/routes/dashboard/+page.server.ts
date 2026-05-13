import { fail, redirect } from '@sveltejs/kit'
import type { ProjectRole } from '$lib/types/database'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { session, user } = await safeGetSession()
	if (!session || !user) redirect(303, '/login')

	const [{ data: projects }, { data: myRoles }, { data: profile }] = await Promise.all([
		supabase
			.from('projects')
			.select('id, name, address, created_at')
			.order('created_at', { ascending: false }),
		supabase
			.from('project_users')
			.select('project_id, role')
			.eq('user_id', user.id),
		supabase
			.from('profiles')
			.select('is_superadmin')
			.eq('id', user.id)
			.single()
	])

	const roleMap = new Map(myRoles?.map(r => [r.project_id, r.role as ProjectRole]) ?? [])

	return {
		user,
		isSuperadmin: profile?.is_superadmin ?? false,
		projects: (projects ?? []).map(p => ({
			...p,
			role: roleMap.get(p.id) ?? ('member' as ProjectRole)
		}))
	}
}

export const actions: Actions = {
	create: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession()
		if (!user) redirect(303, '/login')

		const data = await request.formData()
		const name = (data.get('name') as string)?.trim()
		const address = (data.get('address') as string)?.trim() || null

		if (!name) return fail(400, { error: 'Project name is required.' })

		const { error } = await supabase
			.from('projects')
			.insert({ name, address, owner_id: user.id })

		if (error) return fail(500, { error: 'Error creating project.' })

		return { success: true }
	}
}
