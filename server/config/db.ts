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

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ 
    override: true,
    path: path.join(__dirname, '../../.env') 
});

const pool = new Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: Number(process.env.DB_PORT) || 5432,
    ssl: {
        rejectUnauthorized: false
    },
    max: 5,
    connectionTimeoutMillis: 20000, //20s
    idleTimeoutMillis: 20000, //20s
    allowExitOnIdle: false

});

export default pool;

// Startup message and initial test
pool.query('SELECT NOW()', (err: any, res: any) => {
    if (err) console.error('Database connection error:', err);
    else console.log('Database connected successfully at:', res.rows[0].now);
});