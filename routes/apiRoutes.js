const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── Live sensor simulation ─────────────────────────────────────────────────
const sensors = {
  1: { temp:21.2, humidity:88, co2:780,  light:300, airflow:1.8, ph:6.5 },
  2: { temp:19.5, humidity:79, co2:920,  light:280, airflow:1.5, ph:6.3 },
  3: { temp:23.1, humidity:90, co2:650,  light:350, airflow:2.0, ph:6.7 },
  4: { temp:20.0, humidity:60, co2:500,  light:0,   airflow:0.5, ph:7.0 },
};
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
setInterval(() => {
  for (const id in sensors) {
    const s = sensors[id];
    s.temp     = +clamp(s.temp     + (Math.random()-.5)*.5,  14, 32).toFixed(1);
    s.humidity = +clamp(s.humidity + (Math.random()-.5)*2,   50, 99).toFixed(0);
    s.co2      = +clamp(s.co2      + (Math.random()-.5)*35, 380,1600).toFixed(0);
    s.light    = +clamp(s.light    + (Math.random()-.5)*20,   0, 600).toFixed(0);
    s.airflow  = +clamp(s.airflow  + (Math.random()-.5)*.2,   0,   5).toFixed(1);
    s.ph       = +clamp(s.ph       + (Math.random()-.5)*.08,  5,   8).toFixed(1);
  }
}, 4000);

router.get('/sensors', requireAuth, (req, res) => res.json(sensors));

// ── Rooms ─────────────────────────────────────────────────────────────────
router.post('/rooms', requireAuth, requireRole('admin','manager'), (req, res) => {
  const { name, species, status, start_date, total_days, target_temp, target_humidity, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Room name is required' });
  const r = db.createRoom({ name, species:species||null, status:status||'idle', start_date:start_date||null, total_days:+total_days||21, target_temp:+target_temp||22, target_humidity:+target_humidity||85, notes:notes||null });
  db.log(req.user.id, req.user.username, 'ROOM_CREATE', `Created: ${name}`);
  res.json({ id: r.id });
});

router.put('/rooms/:id', requireAuth, requireRole('admin','manager'), (req, res) => {
  const { status, target_temp, target_humidity, notes } = req.body;
  db.updateRoom(req.params.id, { status, target_temp:+target_temp, target_humidity:+target_humidity, notes });
  db.log(req.user.id, req.user.username, 'ROOM_UPDATE', `Updated room #${req.params.id}`);
  res.json({ success: true });
});

router.delete('/rooms/:id', requireAuth, requireRole('admin'), (req, res) => {
  const room = db.getRoomById(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  db.deleteRoom(req.params.id);
  db.log(req.user.id, req.user.username, 'ROOM_DELETE', `Deleted: ${room.name}`);
  res.json({ success: true });
});

// ── Alerts ────────────────────────────────────────────────────────────────
router.put('/alerts/:id/resolve', requireAuth, requireRole('admin','manager'), (req, res) => {
  db.resolveAlert(req.params.id, req.user.id);
  db.log(req.user.id, req.user.username, 'ALERT_RESOLVE', `Resolved alert #${req.params.id}`);
  res.json({ success: true });
});

// ── Controls ──────────────────────────────────────────────────────────────
router.post('/controls', requireAuth, requireRole('admin','manager'), (req, res) => {
  const { device, state, room_id } = req.body;
  db.log(req.user.id, req.user.username, 'CONTROL', `${device} → ${state}${room_id ? ` (Room ${room_id})` : ''}`);
  res.json({ success: true });
});

// ── Users (admin) ──────────────────────────────────────────────────────────
router.post('/users', requireAuth, requireRole('admin'), (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Username, email and password are required.' });
  if (!['admin','manager','viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  const u = db.createUser({ username, email, password: bcrypt.hashSync(password, 10), role });
  if (!u) return res.status(400).json({ error: 'Username or email already exists.' });
  db.log(req.user.id, req.user.username, 'USER_CREATE', `Created: ${username} (${role})`);
  res.json({ id: u.id });
});

router.put('/users/:id/role', requireAuth, requireRole('admin'), (req, res) => {
  const { role } = req.body;
  if (!['admin','manager','viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  const target = db.getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  db.updateUserRole(req.params.id, role);
  db.log(req.user.id, req.user.username, 'USER_ROLE', `${target.username} → ${role}`);
  res.json({ success: true });
});

router.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  if (+req.params.id === req.user.id) return res.status(400).json({ error: "You cannot delete your own account." });
  const target = db.getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  db.deleteUser(req.params.id);
  db.log(req.user.id, req.user.username, 'USER_DELETE', `Deleted: ${target.username}`);
  res.json({ success: true });
});

// ── Profile ────────────────────────────────────────────────────────────────
router.put('/profile/password', requireAuth, (req, res) => {
  const { current, newpass } = req.body;
  const user = db.getUserById(req.user.id);
  if (!bcrypt.compareSync(current, user.password)) return res.status(400).json({ error: 'Current password is incorrect.' });
  if (!newpass || newpass.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  db.updatePassword(req.user.id, bcrypt.hashSync(newpass, 10));
  db.log(req.user.id, req.user.username, 'PASSWORD_CHANGE');
  res.json({ success: true });
});

module.exports = router;
