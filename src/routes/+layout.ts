import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr'
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public'
import type { LayoutLoad } from './$types'
import type { Database } from '$lib/types/database'

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth')

	const supabase = isBrowser()
		? createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
				global: { fetch }
			})
		: createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
				global: { fetch },
				cookies: {
					getAll() {
						return data.cookies
					},
					setAll() {}
				}
			})

	const {
		data: { session }
	} = await supabase.auth.getSession()

	// getUser() validates the JWT with the Supabase server — fails when offline.
	// Fall back to session.user so cached pages remain functional without network.
	let user = session?.user ?? null
	try {
		const { data: userData } = await supabase.auth.getUser()
		user = userData.user ?? user
	} catch {
		// offline or auth service unreachable — keep session user
	}

	return { session, user, supabase, notifications: data.notifications ?? [] }
}
