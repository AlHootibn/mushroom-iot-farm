const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.cookies.token) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.render('login', { error: 'Please enter your username and password.' });

  const user = db.getUserByName(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.render('login', { error: 'Invalid username or password.' });

  db.updateLastLogin(user.id);
  db.log(user.id, user.username, 'LOGIN', 'Logged in');

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET, { expiresIn: '7d' }
  );
  res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: 'strict' });
  res.redirect('/');
});

router.get('/logout', (req, res) => {
  try {
    const u = jwt.verify(req.cookies.token, JWT_SECRET);
    db.log(u.id, u.username, 'LOGOUT');
  } catch {}
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = router;
