const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mycofarm-secret-2026';

function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('token');
    res.redirect('/login');
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).render('error', {
        user: req.user,
        message: 'You do not have permission to access this page.',
        activePage: ''
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
