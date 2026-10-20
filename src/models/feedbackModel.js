const pool = require('../config/db');

async function hasSubmitted(studentId, courseId) {
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM feedback WHERE student_id=? AND course_id=?', [studentId, courseId]);
  return rows[0].count > 0;
}

async function create(studentId, courseId, rating, comment) {
  const [result] = await pool.query('INSERT INTO feedback (student_id, course_id, rating, comment) VALUES (?, ?, ?, ?)', [studentId, courseId, rating, comment]);
  return result.insertId;
}

async function getByCourse(courseId) {
  const [rows] = await pool.query(`
    SELECT f.*, u.full_name as student_name 
    FROM feedback f 
    JOIN users u ON u.id = f.student_id 
    WHERE f.course_id=? 
    ORDER BY f.created_at DESC
  `, [courseId]);
  return rows;
}

async function getByStudent(studentId) {
  const [rows] = await pool.query(`
    SELECT f.*, c.title as course_title 
    FROM feedback f 
    JOIN courses c ON c.id = f.course_id 
    WHERE f.student_id=? 
    ORDER BY f.created_at DESC
  `, [studentId]);
  return rows;
}

async function getAll(page, limit) {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query('SELECT COUNT(*) as total FROM feedback');
  const [rows] = await pool.query(`
    SELECT f.*, u.full_name as student_name, c.title as course_title 
    FROM feedback f 
    JOIN users u ON u.id = f.student_id 
    JOIN courses c ON c.id = f.course_id 
    ORDER BY f.created_at DESC LIMIT ? OFFSET ?
  `, [parseInt(limit, 10), parseInt(offset, 10)]);
  return { feedback: rows, total: countRows[0].total };
}

async function remove(id) {
  await pool.query('DELETE FROM feedback WHERE id=?', [id]);
}

module.exports = {
  hasSubmitted, create, getByCourse, getByStudent, getAll, remove
};
