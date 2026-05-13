import { error, fail, redirect } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/server/supabase-admin'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
	const [{ data: authUser }, { data: profile }, { data: memberships }, { data: allProjects }] =
		await Promise.all([
			supabaseAdmin.auth.admin.getUserById(params.id),
			supabaseAdmin.from('profiles').select('is_superadmin').eq('id', params.id).single(),
			supabaseAdmin
				.from('project_users')
				.select('project_id, role, projects(id, name)')
				.eq('user_id', params.id),
			supabaseAdmin.from('projects').select('id, name').order('name')
		])

	if (!authUser.user) error(404, 'User not found.')

	const assignedIds = new Set(memberships?.map((m) => m.project_id) ?? [])
	const availableProjects = (allProjects ?? []).filter((p) => !assignedIds.has(p.id))

	return {
		user: {
			id: authUser.user.id,
			email: authUser.user.email ?? '(no email)',
			created_at: authUser.user.created_at,
			is_superadmin: profile?.is_superadmin ?? false
		},
		memberships: (memberships ?? []).map((m) => ({
			project_id: m.project_id,
			role: m.role as 'owner' | 'member',
			project_name: (m.projects as { id: string; name: string } | null)?.name ?? '(unknown)'
		})),
		availableProjects
	}
}

export const actions: Actions = {
	toggle_superadmin: async ({ params }) => {
		const { data: profile } = await supabaseAdmin
			.from('profiles')
			.select('is_superadmin')
			.eq('id', params.id)
			.single()

		if (!profile) return fail(404, { error: 'User not found.' })

		await supabaseAdmin
			.from('profiles')
			.update({ is_superadmin: !profile.is_superadmin })
			.eq('id', params.id)

		return { toggleSuccess: true }
	},

	assign_project: async ({ request, params }) => {
		const data = await request.formData()
		const project_id = data.get('project_id') as string
		const role = data.get('role') as 'owner' | 'member'

		if (!project_id) return fail(400, { error: 'Select a project.' })
		if (!['owner', 'member'].includes(role)) return fail(400, { error: 'Invalid role.' })

		const { error: assignError } = await supabaseAdmin
			.from('project_users')
			.insert({ project_id, user_id: params.id, role })

		if (assignError) return fail(500, { error: 'Error assigning project.' })

		return { assignSuccess: true }
	},

	change_role: async ({ request }) => {
		const data = await request.formData()
		const project_id = data.get('project_id') as string
		const user_id = data.get('user_id') as string
		const role = data.get('role') as 'owner' | 'member'

		await supabaseAdmin
			.from('project_users')
			.update({ role })
			.eq('project_id', project_id)
			.eq('user_id', user_id)

		return { changeRoleSuccess: true }
	},

	remove_project: async ({ request }) => {
		const data = await request.formData()
		const project_id = data.get('project_id') as string
		const user_id = data.get('user_id') as string

		await supabaseAdmin
			.from('project_users')
			.delete()
			.eq('project_id', project_id)
			.eq('user_id', user_id)

		return { removeSuccess: true }
	},

	delete_user: async ({ params }) => {
		await supabaseAdmin.auth.admin.deleteUser(params.id)
		redirect(303, '/admin')
	}
}
