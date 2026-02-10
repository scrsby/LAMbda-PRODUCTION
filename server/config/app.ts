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
 Last Edited: 28 January 2026
*/

import dotenv from 'dotenv';
dotenv.config()

import path, { join } from 'path';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import session from 'express-session';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// Initialize database connections (the require statement itself can trigger the connection attempt in db.js)
import db from './db.js';

// Initialize Express app
const app = express();

// Set up middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:9000'], // Allow both production and dev server ports
  credentials: true
}));

app.use(express.json()); // To parse JSON request bodies

// Import route modules
import adminRoutes from '../routes/admin.js';
import authRoutes from '../routes/auth.js';

// Mount routers (AFTER middleware)
app.use('/admin', adminRoutes); // All routes in adminRoutes will be prefixed with /admin
app.use('/auth', authRoutes); // All routes in authRoutes will be prefixed with /auth

// Session Setup
app.use(
  session({
    secret: 'testtest', // Replace with a strong secret in production
    saveUninitialized: false, // Don't create session until a login occurs
    resave: false, // Don't save session if unmodified
    cookie: {
      secure: false, // Set to true if using HTTPS
      maxAge: 48 * 60 * 60 * 1000 // 2 days in milliseconds
    },
  })
);

// Add the client folder path
app.use('/', express.static(path.join(__dirname, '..', '..', 'client', 'src', 'pages'), {
    extensions: ['html']
}));

// Serve style files (CSS, JS)
app.use('/style', express.static(path.join(__dirname, '..', '..', 'client', 'src', 'style')));

// Serve bundled JavaScript files
app.use('/dist', express.static(path.join(__dirname, '..', '..', 'client', 'dist')));

// Basic error handler (must be after all routes)
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).send('Error');
};
app.use(errorHandler);

// Start the server
const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => { // 0.0.0.0 is important for AWS to listen on all available network interfaces
  console.log(`Server is running on http://localhost:${port} and accessible externally`);
});