'use strict';

const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function csrfProtection(req, res, next) {
  const needsToken = Boolean(req.session.user) || /^\/auth\/(login|register|forgot-password|reset-password)(\/|$)/.test(req.path);
  if (needsToken && !req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrfToken || '';

  if (SAFE_METHODS.has(req.method)) return next();

  const suppliedToken = req.get('x-csrf-token') || req.body?._csrf;
  const expected = Buffer.from(req.session.csrfToken || '');
  const supplied = Buffer.from(typeof suppliedToken === 'string' ? suppliedToken : '');
  const valid = expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
  if (valid) return next();

  if (req.accepts('json')) {
    return res.status(403).json({ success: false, message: 'Request could not be verified. Reload the page and try again.' });
  }
  return res.status(403).render('errors/403', { title: 'Request could not be verified' });
}

module.exports = csrfProtection;
