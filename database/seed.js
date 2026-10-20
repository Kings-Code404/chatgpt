'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runSeed() {
  console.log('🔄 Connecting to MySQL server for seeding...');
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    const seedSql = fs.readFileSync(path.join(__dirname, 'seeds.sql'), 'utf8');
    console.log('🌱 Inserting clearly-labeled demo seed data (database/seeds.sql)...');
    await connection.query(seedSql);
    console.log('✅ Demo seed data inserted successfully!');
    console.log('');
    console.log('Default credentials for testing:');
    console.log('  Admin:   admin@slwa.local   / Password1!');
    console.log('  Teacher: meera@slwa.local   / Password1!');
    console.log('  Teacher: raj@slwa.local     / Password1!');
    console.log('  Student: studenta@slwa.local / Password1!');
    console.log('  Student: studentb@slwa.local / Password1!');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runSeed();
