import type { LayoutServerLoad } from './$types'
import { supabaseAdmin } from '$lib/server/supabase-admin'

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, cookies }) => {
	const { session, user } = await safeGetSession()

	let notifications: Array<{
		id: string
		message: string
		read: boolean
		created_at: string
		item_token: string | null
	}> = []

	if (user) {
		const { data } = await supabaseAdmin
			.from('notifications')
			.select('id, message, read, created_at, item_token')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.limit(30)
		notifications = data ?? []
	}

	return {
		session,
		user,
		cookies: cookies.getAll(),
		notifications
	}
}
