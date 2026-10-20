const pool = require('../config/db');

async function getAll({search, category, status}, page, limit) {
  let query = `
    SELECT c.*, 
      (SELECT GROUP_CONCAT(u.full_name SEPARATOR ', ') 
       FROM teacher_course_assignments tca 
       JOIN users u ON u.id = tca.teacher_id 
       WHERE tca.course_id = c.id) as teacher_names
    FROM courses c WHERE 1=1
  `;
  const params = [];
  if (search) {
    query += ' AND (c.title LIKE ? OR c.code LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    query += ' AND c.category=?';
    params.push(category);
  }
  if (status) {
    query += ' AND c.status=?';
    params.push(status);
  }
  const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) AS cnt`, params);
  
  query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), (page - 1) * limit);
  const [courses] = await pool.query(query, params);
  return { courses, total: countRows[0].total };
}

async function findById(id) {
  const [rows] = await pool.query(`
    SELECT c.*, 
      (SELECT GROUP_CONCAT(u.full_name SEPARATOR ', ') 
       FROM teacher_course_assignments tca 
       JOIN users u ON u.id = tca.teacher_id 
       WHERE tca.course_id = c.id) as teacher_names
    FROM courses c WHERE c.id=?
  `, [id]);
  return rows[0];
}

async function create({code, title, description, category, credits, status, created_by}) {
  const [result] = await pool.query(
    'INSERT INTO courses (code, title, description, category, credits, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [code, title, description, category, credits, status, created_by]
  );
  return result.insertId;
}

async function update(id, data) {
  const fields = Object.keys(data);
  const values = Object.values(data);
  if (fields.length === 0) return;
  const setClauses = fields.map(f => `${f}=?`).join(', ');
  await pool.query(`UPDATE courses SET ${setClauses} WHERE id=?`, [...values, id]);
}

async function remove(id) {
  try {
    const fs = require('fs');
    const [resources] = await pool.query('SELECT file_path FROM study_resources WHERE course_id=?', [id]);
    for (const r of resources) {
      if (r.file_path && fs.existsSync(r.file_path)) {
        try { await fs.promises.unlink(r.file_path); } catch (_) {}
      }
    }
  } catch (_) {}
  await pool.query('DELETE FROM courses WHERE id=?', [id]);
}

async function getCoursesForTeacher(teacherId) {
  const [rows] = await pool.query(`
    SELECT c.* FROM courses c 
    JOIN teacher_course_assignments tca ON tca.course_id = c.id 
    WHERE tca.teacher_id=?
  `, [teacherId]);
  return rows;
}

async function isAssignedToTeacher(courseId, teacherId) {
  const [rows] = await pool.query(
    'SELECT 1 FROM teacher_course_assignments WHERE course_id=? AND teacher_id=? LIMIT 1',
    [courseId, teacherId]
  );
  return rows.length > 0;
}

async function getAssignedTeachers(courseId) {
  const [rows] = await pool.query(`
    SELECT u.* FROM users u 
    JOIN teacher_course_assignments tca ON tca.teacher_id = u.id 
    WHERE tca.course_id=?
  `, [courseId]);
  return rows;
}

async function assignTeacher(courseId, teacherId) {
  await pool.query('INSERT IGNORE INTO teacher_course_assignments (course_id, teacher_id) VALUES (?, ?)', [courseId, teacherId]);
}

async function removeTeacherAssignment(courseId, teacherId) {
  await pool.query('DELETE FROM teacher_course_assignments WHERE course_id=? AND teacher_id=?', [courseId, teacherId]);
}

module.exports = {
  getAll, findById, create, update, remove, 
  getCoursesForTeacher, isAssignedToTeacher, getAssignedTeachers, assignTeacher, removeTeacherAssignment
};
