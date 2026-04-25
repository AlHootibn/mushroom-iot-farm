const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.render('dashboard', { user:req.user, rooms:db.getRooms(), alerts:db.getActiveAlerts(5), activePage:'dashboard' });
});

router.get('/rooms', requireAuth, (req, res) => {
  res.render('rooms', { user:req.user, rooms:db.getRooms(), activePage:'rooms' });
});

router.get('/analytics', requireAuth, (req, res) => {
  res.render('analytics', { user:req.user, rooms:db.getRooms(), activePage:'analytics' });
});

router.get('/controls', requireAuth, requireRole('admin','manager'), (req, res) => {
  res.render('controls', { user:req.user, rooms:db.getRooms(), activePage:'controls' });
});

router.get('/alerts', requireAuth, (req, res) => {
  res.render('alerts', { user:req.user, alerts:db.getAlerts(), rooms:db.getRooms(), activePage:'alerts' });
});

router.get('/logs', requireAuth, (req, res) => {
  res.render('logs', { user:req.user, logs:db.getLogs(200), activePage:'logs' });
});

router.get('/users', requireAuth, requireRole('admin'), (req, res) => {
  const users = db.getUsers().map(u => { const {password, ...rest} = u; return rest; });
  res.render('users', { user:req.user, users, activePage:'users' });
});

router.get('/profile', requireAuth, (req, res) => {
  const profile = db.getUserById(req.user.id);
  const { password, ...safeProfile } = profile;
  res.render('profile', { user:req.user, profile:safeProfile, activity:db.getUserLogs(req.user.id, 10), activePage:'profile' });
});

module.exports = router;
