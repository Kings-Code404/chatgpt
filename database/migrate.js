'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runMigration() {
  const databaseName = process.env.DB_NAME || 'slwa_db';
  if (!/^[A-Za-z0-9_$]+$/.test(databaseName)) {
    throw new Error('DB_NAME must contain only letters, numbers, underscores, or dollar signs.');
  }
  console.log('🔄 Connecting to MySQL server...');
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    let schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    schemaSql = schemaSql.replace('CREATE DATABASE IF NOT EXISTS slwa_db', `CREATE DATABASE IF NOT EXISTS \`${databaseName}\``)
      .replace('USE slwa_db;', `USE \`${databaseName}\`;`);
    console.log('🚀 Running database schema migration (database/schema.sql)...');
    await connection.query(schemaSql);
    console.log('✅ Database schema migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
