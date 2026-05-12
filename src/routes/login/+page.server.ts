import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
	const { session } = await safeGetSession()
	if (session) redirect(303, '/dashboard')
}

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const data = await request.formData()
		const email = (data.get('email') as string)?.trim()
		const password = data.get('password') as string

		if (!email || !password) {
			return fail(400, { error: 'Enter email and password.' })
		}

		const { error } = await supabase.auth.signInWithPassword({ email, password })

		if (error) {
			return fail(400, { error: 'Incorrect email or password.' })
		}

		redirect(303, '/dashboard')
	}
}
