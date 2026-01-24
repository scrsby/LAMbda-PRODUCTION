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

const express = require('express');
const cors = require('cors');
const session = require('express-session');

// Initialize database connections (the require statement itself can trigger the connection attempt in db.js)
require('db.js');

// Import route modules
// const itemRoutes = require('../routes/itemRoutes.js');

// Mount routers
//app.use('/api', itemRoutes); // All routes in itemRoutes will be prefixed with /api

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: 'http://3.145.49.58', // <-- Replace with your actual frontend origin!
  credentials: true
}));

app.use(express.json()); // To parse JSON request bodies

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => { // 0.0.0.0 is important for AWS to listen on all available network interfaces
  console.log(`Server is running on http://localhost:${port} and accessible externally`);
});