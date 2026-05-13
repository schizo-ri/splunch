import { redirect } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/server/supabase-admin'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { safeGetSession } }) => {
	const { user } = await safeGetSession()
	if (!user) redirect(303, '/login')

	const { data: profile } = await supabaseAdmin
		.from('profiles')
		.select('is_superadmin')
		.eq('id', user.id)
		.single()

	if (!profile?.is_superadmin) redirect(303, '/dashboard')
}
