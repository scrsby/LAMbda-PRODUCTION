/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 Name: Database Connection File
 File: db.js
 Required by: app.js
 Description: Creates a pool to connect to the Postgres database
 Last Edited: 27 January 2026
*/

/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 Name: Database Connection File
 File: db.ts
 Required by: app.ts
 Description: Supabase database connection (pg pool + JS client)
 Last Edited: 17 March 2026
*/

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ 
    override: true,
    path: path.join(__dirname, '../../.env') 
});

// DEBUG - remove after fixing
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('__dirname:', __dirname);
console.log('.env path:', path.join(__dirname, '../../.env'));

// ============================================
// PostgreSQL Pool (for direct SQL queries)
// ============================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
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

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export default pool;

// Startup connection test
pool.query('SELECT NOW()', (err: any, res: any) => {
    if (err) console.error('Database connection error:', err);
    else console.log('Database connected successfully at:', res.rows[0].now);
});