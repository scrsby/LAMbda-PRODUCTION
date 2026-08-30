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
function normalizeEnvValue(value) {
    if (!value) {
        return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }
    const hasMatchingQuotes = (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"));
    return hasMatchingQuotes ? trimmed.slice(1, -1).trim() : trimmed;
}
const requestedMode = process.env.MODE?.trim().toLowerCase();
if (requestedMode && requestedMode !== 'local' && requestedMode !== 'production') {
    throw new Error(`Unsupported MODE "${process.env.MODE}". Expected "local" or "production".`);
}
const isRuntimeProduction = process.env.NODE_ENV?.trim().toLowerCase() === 'production';
const mode = isRuntimeProduction ? 'production' : (requestedMode ?? 'production');
const isLocalMode = mode === 'local';
const isProductionMode = mode === 'production';
if (isRuntimeProduction && requestedMode === 'local') {
    console.warn('MODE=local ignored because NODE_ENV=production; using production database configuration.');
}
const connectionStringEnvName = isLocalMode ? 'LOCAL_DATABASE_URL' : 'DATABASE_URL';
const connectionString = normalizeEnvValue(isLocalMode ? process.env.LOCAL_DATABASE_URL : process.env.DATABASE_URL);
if (!connectionString) {
    throw new Error(isLocalMode
        ? 'Missing LOCAL_DATABASE_URL for MODE=local.'
        : 'Missing DATABASE_URL for MODE=production.');
}
let dbDiagnostics = null;
try {
    const parsed = new URL(connectionString);
    dbDiagnostics = {
        host: parsed.hostname || 'unknown',
        port: parsed.port || '5432',
        database: parsed.pathname.replace(/^\//, '') || 'postgres',
        user: decodeURIComponent(parsed.username || '') || 'unknown'
    };
}
catch {
    console.warn('DATABASE_URL format could not be parsed for diagnostics.');
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
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
        if (err?.code === '28P01') {
            console.error(`Postgres authentication failed using ${connectionStringEnvName} in ${mode} mode.`);
            if (dbDiagnostics) {
                console.error('Connection target:', dbDiagnostics);
            }
            console.error('Verify DB credentials in deployment secrets and remove surrounding quotes from DATABASE_URL if present.');
        }
    }
    else {
        console.log(`Database connected successfully in ${mode} mode at:`, res.rows[0].now);
    }
});
//# sourceMappingURL=db.js.map