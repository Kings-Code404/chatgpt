const pool = require('../config/db');

async function isEnrolled(studentId, courseId) {
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM enrollments WHERE student_id=? AND course_id=? AND status="active"', [studentId, courseId]);
  return rows[0].count > 0;
}

async function enroll(studentId, courseId) {
  await pool.query(`
    INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, 'active')
    ON DUPLICATE KEY UPDATE status='active', enrolled_at=CURRENT_TIMESTAMP, completed_at=NULL
  `, [studentId, courseId]);
}

async function drop(studentId, courseId) {
  await pool.query('UPDATE enrollments SET status="dropped" WHERE student_id=? AND course_id=? AND status="active"', [studentId, courseId]);
}

async function getEnrollmentsForStudent(studentId) {
  const [rows] = await pool.query(`
    SELECT e.*, c.title, c.code, c.credits, c.status as course_status 
    FROM enrollments e 
    JOIN courses c ON c.id = e.course_id 
    WHERE e.student_id=?
  `, [studentId]);
  return rows;
}

async function getEnrolledStudents(courseId) {
  const [rows] = await pool.query(`
    SELECT u.*, e.status as enrollment_status, e.enrolled_at 
    FROM users u 
    JOIN enrollments e ON e.student_id = u.id 
    WHERE e.course_id=?
  `, [courseId]);
  return rows;
}

async function getAll(page, limit) {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query('SELECT COUNT(*) as total FROM enrollments');
  const [rows] = await pool.query(`
    SELECT e.*, u.full_name as student_name, u.email as student_email, c.title as course_title, c.code as course_code 
    FROM enrollments e 
    JOIN users u ON u.id = e.student_id 
    JOIN courses c ON c.id = e.course_id 
    ORDER BY e.enrolled_at DESC LIMIT ? OFFSET ?
  `, [parseInt(limit, 10), parseInt(offset, 10)]);
  return { enrollments: rows, total: countRows[0].total };
}

async function updateStatus(id, status) {
  await pool.query('UPDATE enrollments SET status=? WHERE id=?', [status, id]);
}

module.exports = {
  isEnrolled, enroll, drop, getEnrollmentsForStudent, getEnrolledStudents, getAll, updateStatus
};
