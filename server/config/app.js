/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 Name: App File
 File: app.js
 Required by: 
 Description: This is the main file for the LAMbda server application, setting up configurations and middleware. It is run on server start.
 Functions: 
 Last Edited: 22 January 2026
*/

const path = require('path');
require('dotenv').config({ 
    override: true,
    path: path.join(__dirname, '../../.env') 
});

const {Pool, Client} = require('pg');

const pool = new Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});


(async () => {
    const client = await pool.connect();
    try {
        const {rows} = await client.query('SELECT current_user');
        const currentUser = rows[0]['current_user'];
        console.log(currentUser);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
    }
})();