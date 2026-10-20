const crypto = require('crypto');
const pool = require('../config/db');

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT u.*, r.name as role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email=?', [email]);
  return rows[0];
}

async function findById(id) {
  const [rows] = await pool.query(`
    SELECT u.id, u.role_id, u.full_name, u.email, u.status, u.created_at, u.updated_at, r.name as role
    FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?
  `, [id]);
  return rows[0];
}

async function createUser({role_id, full_name, email, password_hash}) {
  const [result] = await pool.query('INSERT INTO users (role_id, full_name, email, password_hash) VALUES (?, ?, ?, ?)', [role_id, full_name, email, password_hash]);
  return result.insertId;
}

async function updateStatus(id, status) {
  await pool.query('UPDATE users SET status=? WHERE id=?', [status, id]);
}

async function setResetToken(id, token, expiry) {
  await pool.query('UPDATE users SET reset_token=?, reset_token_expiry=? WHERE id=?', [token, expiry, id]);
}

async function findByResetToken(token) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [rows] = await pool.query('SELECT id, reset_token FROM users WHERE reset_token=? AND reset_token_expiry > NOW()', [tokenHash]);
  return rows[0];
}

async function clearResetToken(id) {
  await pool.query('UPDATE users SET reset_token=NULL, reset_token_expiry=NULL WHERE id=?', [id]);
}

async function getAll({search, roleId, status}, page, limit) {
  let query = `SELECT u.id, u.full_name, u.email, u.status, u.created_at, u.updated_at, r.name as role
    FROM users u JOIN roles r ON r.id=u.role_id WHERE 1=1`;
  const params = [];
  if (search) {
    query += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (roleId) {
    query += ' AND u.role_id=?';
    params.push(roleId);
  }
  if (status) {
    query += ' AND u.status=?';
    params.push(status);
  }
  const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) AS cnt`, params);
  
  query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
  const offset = (page - 1) * limit;
  params.push(parseInt(limit, 10), parseInt(offset, 10));
  
  const [users] = await pool.query(query, params);
  return { users, total: countRows[0].total };
}

async function updateUser(id, {full_name, status}) {
  await pool.query('UPDATE users SET full_name=?, status=? WHERE id=?', [full_name, status, id]);
}

async function getProfile(userId, role) {
  let table = role === 'student' ? 'student_profiles' : 'teacher_profiles';
  const [rows] = await pool.query(`SELECT * FROM ${table} WHERE user_id=?`, [userId]);
  return rows[0];
}

async function upsertStudentProfile(userId, data) {
  const fields = Object.keys(data);
  const values = Object.values(data);
  if (fields.length === 0) return;
  const setClauses = fields.map(f => `${f}=?`).join(', ');
  const query = `INSERT INTO student_profiles (user_id, ${fields.join(', ')}) VALUES (?, ${fields.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${setClauses}`;
  await pool.query(query, [userId, ...values, ...values]);
}

async function upsertTeacherProfile(userId, data) {
  const fields = Object.keys(data);
  const values = Object.values(data);
  if (fields.length === 0) return;
  const setClauses = fields.map(f => `${f}=?`).join(', ');
  const query = `INSERT INTO teacher_profiles (user_id, ${fields.join(', ')}) VALUES (?, ${fields.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${setClauses}`;
  await pool.query(query, [userId, ...values, ...values]);
}

async function deleteUser(id) {
  await pool.query('DELETE FROM users WHERE id=?', [id]);
}

module.exports = {
  findByEmail, findById, createUser, updateStatus, setResetToken,
  findByResetToken, clearResetToken, getAll, updateUser, getProfile,
  upsertStudentProfile, upsertTeacherProfile, deleteUser
};
