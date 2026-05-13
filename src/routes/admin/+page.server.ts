import { fail } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/server/supabase-admin'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const [{ data: authData }, { data: profiles }, { data: memberships }] = await Promise.all([
		supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
		supabaseAdmin.from('profiles').select('id, is_superadmin'),
		supabaseAdmin.from('project_users').select('user_id, role')
	])

	const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])

	const countMap = new Map<string, { owner: number; member: number }>()
	for (const m of memberships ?? []) {
		const c = countMap.get(m.user_id) ?? { owner: 0, member: 0 }
		if (m.role === 'owner') c.owner++
		else c.member++
		countMap.set(m.user_id, c)
	}

	const users = (authData?.users ?? []).map((u) => ({
		id: u.id,
		email: u.email ?? '(no email)',
		created_at: u.created_at,
		is_superadmin: profileMap.get(u.id)?.is_superadmin ?? false,
		projects: countMap.get(u.id) ?? { owner: 0, member: 0 }
	}))

	users.sort((a, b) => a.email.localeCompare(b.email))

	return { users }
}

export const actions: Actions = {
	create_user: async ({ request }) => {
		const data = await request.formData()
		const email = (data.get('email') as string)?.trim().toLowerCase()
		const password = data.get('password') as string

		if (!email) return fail(400, { error: 'Email is required.' })
		if (!password || password.length < 8) return fail(400, { error: 'Password must be at least 8 characters.' })

		const { error } = await supabaseAdmin.auth.admin.createUser({
			email,
			password,
			email_confirm: true
		})

		if (error) {
			if (error.message.includes('already')) return fail(409, { error: 'A user with this email already exists.' })
			return fail(500, { error: 'Error creating user.' })
		}

		return { success: true }
	}
}
