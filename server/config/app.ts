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
 Last Edited: 24 January 2026
*/

import path from 'path';
import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import session from 'express-session';

// Initialize database connections (the require statement itself can trigger the connection attempt in db.js)
import './db';

// Import route modules
// const itemRoutes = require('../routes/itemRoutes.js');

// Mount routers
// app.use('/api', itemRoutes); // All routes in itemRoutes will be prefixed with /api

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // PRODUCTION - Replace with real host
  credentials: true
}));

app.use(express.json()); // To parse JSON request bodies

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