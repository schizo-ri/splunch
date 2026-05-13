import { error } from '@sveltejs/kit'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import type { ProjectRole } from '$lib/types/database'
import type { PageLoad } from './$types'

function photoUrl(path: string) {
	return `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/punch-photos/${path}`
}

export const load: PageLoad = async ({ params, parent }) => {
	const { supabase, user } = await parent()

	const { data: item } = await supabase
		.from('punch_items')
		.select('*, projects(name), areas(name)')
		.eq('share_token', params.token)
		.single()

	if (!item) error(404, 'Item not found.')

	const [{ data: photos }, { data: comments }, { data: membership }, { data: areas }] =
		await Promise.all([
			supabase.from('photos').select('*').eq('punch_item_id', item.id).order('created_at'),
			supabase.from('comments').select('*').eq('punch_item_id', item.id).order('created_at'),
			user && item.project_id
				? supabase
						.from('project_users')
						.select('role')
						.eq('project_id', item.project_id)
						.eq('user_id', user.id)
						.single()
				: Promise.resolve({ data: null }),
			item.project_id
				? supabase
						.from('areas')
						.select('id, name')
						.eq('project_id', item.project_id)
						.is('archived_at', null)
						.order('name')
				: Promise.resolve({ data: [] })
		])

	return {
		item,
		photos: (photos ?? []).map((p) => ({ ...p, url: photoUrl(p.storage_path) })),
		comments: comments ?? [],
		areas: areas ?? [],
		userRole: (membership?.role ?? null) as ProjectRole | null
	}
}
