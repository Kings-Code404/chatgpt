'use strict';
const userModel = require('../models/userModel');

/**
 * Ensure the user is authenticated.
 * Redirects to /auth/login with a flash message if not.
 */
async function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    req.flash('error', 'Please log in to access that page.');
    return res.redirect('/auth/login');
  }
  try {
    const user = await userModel.findById(req.session.user.id);
    if (!user || user.status !== 'active') {
      return req.session.destroy(() => res.redirect('/auth/login'));
    }
    // Apply role and account changes immediately to already-open sessions.
    req.session.user = {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      email: user.email,
      status: user.status
    };
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Redirect already-authenticated users to their dashboard.
 * Use on login/register pages.
 */
function redirectIfAuth(req, res, next) {
  if (!req.session || !req.session.user) return next();
  return res.redirect(dashboardFor(req.session.user.role));
}

/**
 * Factory: require a specific role (or array of roles).
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.flash('error', 'Please log in.');
      return res.redirect('/auth/login');
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }
    next();
  };
}

function dashboardFor(role) {
  switch (role) {
    case 'admin':   return '/admin/dashboard';
    case 'teacher': return '/teacher/dashboard';
    case 'student': return '/student/dashboard';
    default:        return '/';
  }
}

module.exports = { requireAuth, redirectIfAuth, requireRole, dashboardFor };
