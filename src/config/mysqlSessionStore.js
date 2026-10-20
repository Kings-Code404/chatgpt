'use strict';

const session = require('express-session');

class MySQLSessionStore extends session.Store {
  constructor(pool) {
    super();
    this.pool = pool;
    this.cleanupTimer = setInterval(() => {
      this.pool.query('DELETE FROM user_sessions WHERE expires <= ?', [Date.now()])
        .catch(err => console.error('[session cleanup] Database operation failed:', err.code || 'unknown error'));
    }, 15 * 60 * 1000);
    this.cleanupTimer.unref?.();
  }

  get(sid, callback) {
    this.pool.query('SELECT session_data FROM user_sessions WHERE sid=? AND expires>? LIMIT 1', [sid, Date.now()])
      .then(([rows]) => {
        if (!rows.length) return callback(null, null);
        try {
          callback(null, typeof rows[0].session_data === 'string'
            ? JSON.parse(rows[0].session_data)
            : rows[0].session_data);
        } catch (error) {
          callback(error);
        }
      })
      .catch(callback);
  }

  set(sid, sess, callback = () => {}) {
    const expires = sess.cookie?.expires
      ? new Date(sess.cookie.expires).getTime()
      : Date.now() + (sess.cookie?.maxAge || 24 * 60 * 60 * 1000);
    this.pool.query(`
      INSERT INTO user_sessions (sid, session_data, expires) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE session_data=VALUES(session_data), expires=VALUES(expires)
    `, [sid, JSON.stringify(sess), expires]).then(() => callback(null)).catch(callback);
  }

  touch(sid, sess, callback = () => {}) {
    const expires = sess.cookie?.expires
      ? new Date(sess.cookie.expires).getTime()
      : Date.now() + (sess.cookie?.maxAge || 24 * 60 * 60 * 1000);
    this.pool.query('UPDATE user_sessions SET expires=? WHERE sid=?', [expires, sid])
      .then(() => callback(null)).catch(callback);
  }

  destroy(sid, callback = () => {}) {
    this.pool.query('DELETE FROM user_sessions WHERE sid=?', [sid])
      .then(() => callback(null)).catch(callback);
  }
}

module.exports = MySQLSessionStore;
