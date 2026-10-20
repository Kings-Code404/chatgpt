'use strict';

/**
 * 404 handler – must be placed after all routes.
 */
function notFound(req, res) {
  res.status(404).render('errors/404', {
    title: 'Page Not Found',
    path: req.path,
  });
}

/**
 * Global error handler – must have 4 parameters.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Multer file errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    req.flash('error', `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10} MB.`);
    return res.redirect('back');
  }
  if (err.message && err.message.startsWith('File type')) {
    req.flash('error', err.message);
    return res.redirect('back');
  }

  // Log the full error in dev; mask in production
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err);
  } else {
    console.error('[Error]', err.message);
  }

  const status = err.status || 500;
  res.status(status).render('errors/500', {
    title: 'Something went wrong',
    message: process.env.NODE_ENV !== 'production' ? err.message : 'An unexpected error occurred.',
  });
}

module.exports = { notFound, errorHandler };
