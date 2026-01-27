/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 Name: Authentication Routes
 File: auth.ts
 Required by: 
 Description: Handles 
 Functions: 
 Last Edited: 25 January 2026
*/

const express = require('express');
const router = express.Router();
const { inventoryPool } = require('../config/db');

// Bcrypt for password hashing
const bcrypt = require('bcrypt');
const saltRounds = 10;

// CREATE ACCOUNT //
// Route to handle account creation
router.post('/create-account', async (req, res) => {
  const { username, plainPassword, accessCode } = req.body;

  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

  const updateQuery = 'UPDATE users SET username = ?, password_hash = ?, access_code = NULL WHERE access_code = ?';
  const selectIdQuery = 'SELECT id, user_type FROM users WHERE access_code = ?';

  try {
    // Get the user id before updating
    const [idResults] = await inventoryPool.query(selectIdQuery, [accessCode]);
    if (idResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Access code not found' });
    }
    const userId = idResults[0].id;
    const user_type = idResults[0].user_type;

    // Update the password_hash and set access_code to NULL
    await inventoryPool.query(updateQuery, [username, hashedPassword, accessCode]);

    res.status(200).json({ success: true, message: 'Account created successfully', id: userId, account_type: user_type });
  } catch (err) {
    console.error('Error creating account:', err);
    res.status(500).json({ message: 'Error creating account', error: err.message });
  }
});

// UPDATE ACCOUNT //
// Updates first and last name and booth number when a user is done creating their account
router.post('/update-account', async (req, res) => {
  const { userId, firstName, lastName, email } = req.body;
  const query = 'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?';
  try {
    await inventoryPool.query(query, [firstName, lastName, email, userId]);
    res.status(200).json({ success: true, message: 'Account updated successfully' });
  } catch (err) {
    console.error('Error updating account:', err);
    res.status(500).json({ message: 'Error updating account', error: err.message });
  }
});

// CHECK VENDOR ACCOUNT//
// Check to see if a user's vendor code already has an entry in the vendor table
router.get('/check-vendor-exists/:vendor_id/', async (req, res) => {
  const { vendor_id } = req.params;
  const query = 'SELECT * FROM vendors WHERE vendor_id = ?';
  try {
    const [results] = await inventoryPool.query(query, [vendor_id]);
    if (results.length > 0) {
      res.status(200).json({ exists: true, message: 'Vendor already exists' });
    } else {
      res.status(200).json({ exists: false, message: 'Vendor does not exist' });
    }
  } catch (err) {
    console.error('Error checking vendor existence:', err);
    res.status(500).json({ message: 'Error checking vendor existence', error: err.message });
  }
});

// CREATE VENDOR ACCOUNT //
// Route to handle seller account creation
router.post('/create-vendor-account', async (req, res) => {
  const { vendor_id } = req.body; // Only using vendor_id
  const query = 'INSERT INTO vendors ( vendor_id ) VALUES ( ? )';
  try {
    const [result] = await inventoryPool.query(query, [vendor_id]);
    res.status(201).json({ message: 'Seller account created successfully', success: true });
  } catch (err) {
    console.error('Error creating seller account:', err);
    res.status(500).json({ message: 'Error creating seller account', error: err.message, success: false });
  }
});

// Route to check if a username exists and return its password_hash
router.get('/check-username/:username', async (req, res) => {
  const { username } = req.params;
  const query = 'SELECT password_hash FROM users WHERE username = ?';
  try {
    const [results] = await inventoryPool.query(query, [username]);
    if (results.length > 0) {
      res.status(200).json({ exists: true, password_hash: results[0].password_hash });
    } else {
      res.status(404).json({ exists: false, message: 'Username not found' });
    }
  } catch (err) {
    console.error('Error checking username:', err);
    res.status(500).json({ message: 'Error checking username', error: err.message });
  }
});

// Route to check if a vendor ID exists in the vendors database
router.get('/check-booth-number/:vendor_id', async (req, res) => {
  const { vendor_id } = req.params;
  const query = 'SELECT vendor_id FROM vendors WHERE vendor_id = ?';
  try {
    const [results] = await inventoryPool.query(query, [vendor_id]);
    if (results.length > 0) {
      res.status(200).json({ exists: true, message: 'Vendor ID already exists!' });
    } else {
      res.status(200).json({ exists: false, message: 'Vendor ID is available!' });
    }
  } catch (err) {
    console.error('Error checking vendor ID:', err);
    res.status(500).json({ message: 'Error checking vendor ID', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password: plainPassword } = req.body; // Rename for clarity
  const query = 'SELECT password_hash, user_type, vendor_id, first_name FROM users WHERE username = ?';
  try {
    const [results] = await inventoryPool.query(query, [username]);
    if (results.length > 0) {
      const user = results[0];
      const storedHashedPassword = user.password_hash;

      // Compare the plain-text password with the stored hash
      const passwordMatch = await bcrypt.compare(plainPassword, storedHashedPassword); //

      if (passwordMatch) { //
        // Log user data for debugging
        console.log("User data for login:", {
          username,
          user_type: user.user_type,
          vendor_id: user.vendor_id,
          first_name: user.first_name
        });
        
        // Set session variables
        req.session.username = username;
        req.session.first_name = user.first_name || 'ERROR';
        req.session.user_type = user.user_type;
        req.session.vendor_id = user.vendor_id || null;

        res.status(200).json({ 
          success: true, 
          accountType: user.user_type,
          message: `Login successful. Vendor ID: ${user.vendor_id || 'Not set'}`
        });
      } else {
        res.status(200).json({ success: false, message: 'Invalid username or password' }); // Generic message for security
      }
    } else {
      res.status(200).json({ success: false, message: 'Invalid username or password' }); // Generic message for security
    }
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ success: false, message: 'Error logging in', error: err.message });
  }
});

// Rout to check user information in session
router.get('/session-info', (req, res) => {
  if (req.session && req.session.username) {
    res.json({
      loggedIn: true,
      username: req.session.username,
      first_name: req.session.first_name,
      user_type: req.session.user_type,
      vendor_id: req.session.vendor_id
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// Route to check if an access code exists
router.get('/check-access-code/:access_code', async (req, res) => {
  let {access_code} = req.params;

  let checkQuery = 'SELECT id FROM users WHERE access_code = ?';
  let params = [access_code];
  
  try {
    const [results] = await inventoryPool.query(checkQuery, params);
    if (results.length > 0) {
      res.status(200).json({ exists: true, userId: results[0].id });
    } else {
      res.status(404).json({ exists: false, message: 'Access code not found' });
    }
  } catch (err) {
    console.error('Error checking booth number and access code:', err);
    res.status(500).json({ message: 'Error checking booth number and access code', error: err.message });
  }
});

// Check to see if a given access code is already in use
router.get('/check-access-code/:access_code', async (req, res) => {
  const { access_code } = req.params;
  const query = 'SELECT id FROM users WHERE access_code = ?';
  try {
    const [results] = await inventoryPool.query(query, [access_code]);
    if (results.length > 0) {
      res.status(200).json({ exists: true, id: results[0].id });
    } else {
      res.status(404).json({ exists: false, message: 'Access code not found' });
    }
  } catch (err) {
    console.error('Error checking access code:', err);
    res.status(500).json({ message: 'Error checking access code', error: err.message });
  }
});

// Check if vendor ID and access code combination is valid
router.get('/check-vendor-access-code/:vendor_id/:access_code', async (req, res) => {
  const { vendor_id, access_code } = req.params;
  const query = 'SELECT u.id FROM users u JOIN vendors v ON u.vendor_id = v.vendor_id WHERE u.access_code = ? AND v.vendor_id = ?';
  try {
    const [results] = await inventoryPool.query(query, [access_code, vendor_id]);
    if (results.length > 0) {
      res.status(200).json({ exists: true, userId: results[0].id });
    } else {
      res.status(404).json({ exists: false, message: 'Vendor ID/access code combination not found' });
    }
  } catch (err) {
    console.error('Error checking vendor ID and access code:', err);
    res.status(500).json({ message: 'Error checking vendor ID and access code', error: err.message });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ message: 'Error logging out' });
      }
      res.status(200).json({ message: 'Logged out successfully' });
    });
  } else {
    res.status(400).json({ message: 'No active session to log out' });
  }
});

module.exports = router;