import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dyjaqtmxrrapgcktvzxe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nQQnNBqLNvT4kEJ5BlHqAA_Jxygg4h8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
