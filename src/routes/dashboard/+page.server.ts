import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { session, user } = await safeGetSession()
	if (!session) redirect(303, '/login')

	const { data: projects } = await supabase
		.from('projects')
		.select('id, name, address, created_at')
		.order('created_at', { ascending: false })

	return { user, projects: projects ?? [] }
}

export const actions: Actions = {
	create: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession()
		if (!user) redirect(303, '/login')

		const data = await request.formData()
		const name = (data.get('name') as string)?.trim()
		const address = (data.get('address') as string)?.trim() || null

		if (!name) return fail(400, { error: 'Naziv projekta je obavezan.' })

		const { error } = await supabase
			.from('projects')
			.insert({ name, address, owner_id: user.id })

		if (error) return fail(500, { error: 'Greška pri kreiranju projekta.' })

		return { success: true }
	}
}
