import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ 
    path: path.join(process.cwd(), '.env') 
});

const mode = process.env.MODE?.trim().toLowerCase() ?? 'production';
const isLocalMode = mode === 'local';
const isProductionMode = mode === 'production';

if (!isLocalMode && !isProductionMode) {
    throw new Error(`Unsupported MODE "${process.env.MODE}". Expected "local" or "production".`);
}

const connectionString = isLocalMode ? process.env.LOCAL_DATABASE_URL : process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error(
        isLocalMode
            ? 'Missing LOCAL_DATABASE_URL for MODE=local.'
            : 'Missing DATABASE_URL for MODE=production.'
    );
}

// ============================================
// PostgreSQL Pool (for direct SQL queries)
// ============================================
const pool = new Pool({
    connectionString,
    ssl: isLocalMode
        ? false
        : {
            rejectUnauthorized: false
        },
    max: 5,
    connectionTimeoutMillis: 20000,
    idleTimeoutMillis: 20000,
    allowExitOnIdle: false
});

// ============================================
// Supabase JS Client (for realtime, auth, storage)
// ============================================
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = isProductionMode
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

export { isLocalMode, isProductionMode, mode };

export default pool;

// Startup connection test
pool.query('SELECT NOW()', (err: any, res: any) => {
    if (err) console.error('Database connection error:', err);
    else console.log(`Database connected successfully in ${mode} mode at:`, res.rows[0].now);
});