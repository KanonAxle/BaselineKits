// Authentication routes - handles user signup, login, and profile
const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// HELPER: Generate a JWT login token for a user
function generateToken(userId) {
  return jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// HELPER: Verify a JWT token from an incoming request
function verifyToken(req) {
  const authHeader = req.headers.authorization;

  // No header sent at all
  if (!authHeader) return null;

  // Header format is "Bearer TOKEN" — extract just the token
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

// -------------------------------------------------------
// ENDPOINT 1: Register (Create New Account)
// POST /api/auth/register
// -------------------------------------------------------
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Make sure all fields were provided
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if this email is already registered
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash the password so it is never stored as plain text
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Save the new user to the database
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ email, password_hash: hashedPassword, name }])
      .select();

    if (insertError) {
      return res.status(500).json({ error: 'Failed to create account' });
    }

    // Create a token so the user is logged in immediately
    const token = generateToken(newUser[0].id);

    res.status(201).json({
      user_id: newUser[0].id,
      token,
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// -------------------------------------------------------
// ENDPOINT 2: Login
// POST /api/auth/login
// -------------------------------------------------------
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find the user by email
    const { data: user, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (selectError || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare the submitted password against the stored hash
    const passwordMatch = await bcryptjs.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    res.status(200).json({
      user_id: user.id,
      token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// -------------------------------------------------------
// ENDPOINT 3: Get Current User Info
// GET /api/auth/me
// -------------------------------------------------------
router.get('/auth/me', async (req, res) => {
  try {
    // Verify the token sent in the Authorization header
    const userId = verifyToken(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - invalid or missing token' });
    }

    // Fetch the user from the database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error getting user info' });
  }
});

// Export so server.js can register these routes
module.exports = router;
