import type { PunchStatus } from './types/database'

export const STATUS_LABEL: Record<PunchStatus, string> = {
	open:     'Open',
	resolved: 'Resolved',
	reviewed: 'Reviewed',
	closed:   'Closed',
	reopened: 'Reopened'
}

export const STATUS_BADGE_CLASS: Record<PunchStatus, string> = {
	open:     'badge badge-open',
	resolved: 'badge badge-resolved',
	reviewed: 'badge badge-reviewed',
	closed:   'badge badge-closed',
	reopened: 'badge badge-reopened'
}
