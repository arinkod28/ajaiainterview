const express = require('express');
const bcrypt = require('bcryptjs');
const { query, get } = require('../db');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  res.json({ 
    user: { id: user.id, email: user.email, username: user.username } 
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// Get current user
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = get('SELECT id, email, username FROM users WHERE id = ?', [req.session.userId]);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  res.json({ user });
});

// List all users (for sharing UI)
router.get('/users', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const users = query('SELECT id, email, username FROM users WHERE id != ?', [req.session.userId]);
  res.json({ users });
});

module.exports = router;
