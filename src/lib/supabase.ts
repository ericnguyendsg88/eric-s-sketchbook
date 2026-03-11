import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ilotsysmobfeqbvurtcz.supabase.co';
const supabaseKey = 'sb_publishable_3DIDp1yRMtjGnGksqZL6mg_GDj6z3pD';

export const supabase = createClient(supabaseUrl, supabaseKey);
