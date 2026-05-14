import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database';

export type NotifItem = {
	id: string;
	message: string;
	read: boolean;
	created_at: string;
	item_token: string | null;
};

export type NotifContext = {
	readonly notifications: NotifItem[];
	readonly supabase: SupabaseClient<Database>;
	readonly user: { id: string } | null;
};
