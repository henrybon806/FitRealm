// lib/supabase.ts
import 'react-native-url-polyfill/auto'

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL as url, SUPABASE_ANON_KEY as key } from '@env';

export const supabase = createClient(url, key);
