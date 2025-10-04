import { createClient } from '@supabase/supabase-js';
import logger from './logger';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	logger.error(
		'Missing Supabase environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
	);
	throw new Error('Supabase configuration error');
}

if (!supabaseAnonKey) {
	logger.error('Missing Supabase environment variable: SUPABASE_ANON_KEY');
	throw new Error('Supabase configuration error');
}

// Admin client with service role key for backend operations (user creation, deletion, etc.)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

// Auth client with anon key for authentication operations (signin)
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

logger.info('Supabase admin client initialized');
logger.info('Supabase auth client initialized');

export { supabaseAdmin, supabaseAuth };