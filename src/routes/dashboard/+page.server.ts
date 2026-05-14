import { fail, redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

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
