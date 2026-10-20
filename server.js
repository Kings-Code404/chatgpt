'use strict';
require('dotenv').config();

const express        = require('express');
const session        = require('express-session');
const flash          = require('connect-flash');
const methodOverride = require('method-override');
const path           = require('path');
const rateLimit      = require('express-rate-limit');
const pool           = require('./src/config/db');
const MySQLSessionStore = require('./src/config/mysqlSessionStore');

const authRoutes          = require('./src/routes/auth');
const publicRoutes        = require('./src/routes/public');
const studentRoutes       = require('./src/routes/student');
const teacherRoutes       = require('./src/routes/teacher');
const adminRoutes         = require('./src/routes/admin');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const csrfProtection = require('./src/middleware/csrf');

const app  = express();
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production' && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  next();
});

// ─── View engine ─────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Static assets ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride((req) => {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    const method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

// ─── Session ─────────────────────────────────────────────────────────────────
const sessionSecret = process.env.SESSION_SECRET || 'slwa_dev_secret_change_in_production';
if (process.env.NODE_ENV === 'production' && (sessionSecret === 'slwa_dev_secret_change_in_production' || sessionSecret.length < 32)) {
  console.error('FATAL: Set SESSION_SECRET to a random value with at least 32 characters in production.');
  process.exit(1);
}

app.use(session({
  secret: sessionSecret,
  store: new MySQLSessionStore(pool),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000  // 24 h
  }
}));

// ─── Flash messages ──────────────────────────────────────────────────────────
app.use(flash());

// ─── Global template locals ──────────────────────────────────────────────────
app.use((req, res, next) => {
  const flashMessages = req.session.flash || {};
  res.locals.currentUser   = req.session.user || null;
  res.locals.success_msg   = flashMessages.success || [];
  res.locals.error_msg     = flashMessages.error || [];
  res.locals.info_msg      = flashMessages.info || [];
  delete flashMessages.success;
  delete flashMessages.error;
  delete flashMessages.info;
  if (Object.keys(flashMessages).length === 0) delete req.session.flash;
  next();
});
app.use(csrfProtection);

// ─── Rate limiting ───────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/auth', authLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
const { requireAuth } = require('./src/middleware/auth');
const notificationModel = require('./src/models/notificationModel');

app.get('/healthz', async (_req, res) => {
  try {
    await pool.query('SELECT 1 FROM user_sessions LIMIT 1');
    res.status(200).json({ status: 'ok' });
  } catch (_err) {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.get('/api/notifications/count', requireAuth, async (req, res) => {
  try {
    const data = await notificationModel.getForUser(req.session.user.id, 1, 1);
    res.json({ unread: data.unreadCount || 0 });
  } catch (_err) {
    res.status(500).json({ unread: 0, error: 'Unable to load notification count.' });
  }
});

app.use('/',          publicRoutes);
app.use('/auth',      authRoutes);
app.use('/student',   studentRoutes);
app.use('/teacher',   teacherRoutes);
app.use('/admin',     adminRoutes);

// ─── Errors ──────────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ SLWA server running at http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
