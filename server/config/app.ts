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
import connectPgSimple from 'connect-pg-simple';
import pool from './db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// Initialize Express app
const app = express();

// Trust the first proxy (AWS ALB / reverse proxy) so req.secure reflects
// the original HTTPS connection and Secure cookies work correctly.
app.set('trust proxy', 1);

// Set up middleware
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:9000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json()); // To parse JSON request bodies

// Session Setup (must be before routes)
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable must be set in production');
}
const PgSessionStore = connectPgSimple(session);
app.use(
  session({
    store: new PgSessionStore({
      pool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'testtest', // Must be set via SESSION_SECRET env variable in production
    saveUninitialized: false, // Don't create session until a login occurs
    resave: false, // Don't save session if unmodified
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true, // Prevent client-side JS access
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Required for cross-site cookie sending in production
      maxAge: 48 * 60 * 60 * 1000 // 2 days in milliseconds
    },
  })
);

// Import route modules
import adminRoutes from '../routes/admin.js';
import authRoutes from '../routes/auth.js';
import inventoryRoutes from '../routes/inventory.js';
import posRoutes from '../routes/POS.js';
import vendorRoutes from '../routes/vendor.js';

// Mount routers (AFTER middleware)
app.use('/admin', adminRoutes); // All routes in adminRoutes will be prefixed with /admin
app.use('/auth', authRoutes); // All routes in authRoutes will be prefixed with /auth
app.use('/inventory', inventoryRoutes); // All routes in inventoryRoutes will be prefixed with /inventory
app.use('/POS', posRoutes); // All routes in posRoutes will be prefixed with /POS
app.use('/vendor', vendorRoutes); // All routes in vendorRoutes will be prefixed with /vendor

// Add the client folder path
app.use('/', express.static(path.join(__dirname, '..', '..', 'client', 'src', 'pages'), {
    extensions: ['html']
}));


// Serve image files
app.use('/assets', express.static(path.join(__dirname, '..', '..', 'client', 'src', 'assets')));

// Serve style files (CSS, JS)
app.use('/style', express.static(path.join(__dirname, '..', '..', 'client', 'src', 'style')));

// Serve bundled JavaScript files
app.use('/dist', express.static(path.join(__dirname, '..', '..', 'client', 'dist')));

// Basic error handler (must be after all routes)
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err.stack);
  if (!res.headersSent) {
    res.status(500).send('Error');
  }
};
app.use(errorHandler);

// Start the server
const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => { // 0.0.0.0 is important for AWS to listen on all available network interfaces
  console.log(`Server is running on http://localhost:${port} and accessible externally`);
});