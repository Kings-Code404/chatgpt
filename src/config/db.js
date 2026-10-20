'use strict';
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'slwa_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
});

// Non-blocking connectivity test on startup
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected to database:', process.env.DB_NAME || 'slwa_db');
    conn.release();
  })
  .catch(err => {
    console.warn('⚠️  MySQL connection warning:', err.message);
    console.warn('   Ensure MySQL (or XAMPP/MariaDB) is running on port ' + (process.env.DB_PORT || 3306) + ' and database "' + (process.env.DB_NAME || 'slwa_db') + '" exists.');
    console.warn('   Run "npm run migrate" and "npm run seed" once your database server is active.');
  });

module.exports = pool;
