'use strict';
const pool = require('../config/db');

async function create({ course_id, uploaded_by, title, description, file_path, original_name, file_type, file_size }) {
  const [result] = await pool.query(
    `INSERT INTO study_resources 
      (course_id, uploaded_by, title, description, file_path, original_name, file_type, file_size) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [course_id, uploaded_by, title, description, file_path, original_name, file_type, file_size]
  );
  return result.insertId;
}

async function findByCourse(courseId) {
  const [rows] = await pool.query(`
    SELECT sr.*, u.full_name as uploader_name 
    FROM study_resources sr 
    LEFT JOIN users u ON u.id = sr.uploaded_by 
    WHERE sr.course_id=? 
    ORDER BY sr.created_at DESC
  `, [courseId]);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(`
    SELECT sr.*, c.title as course_title, c.code as course_code 
    FROM study_resources sr 
    JOIN courses c ON c.id = sr.course_id 
    WHERE sr.id=?
  `, [id]);
  return rows[0];
}

async function remove(id) {
  await pool.query('DELETE FROM study_resources WHERE id=?', [id]);
}

async function getAll(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query('SELECT COUNT(*) as total FROM study_resources');
  const [rows] = await pool.query(`
    SELECT sr.*, c.title as course_title, c.code as course_code, u.full_name as uploader_name 
    FROM study_resources sr 
    JOIN courses c ON c.id = sr.course_id 
    LEFT JOIN users u ON u.id = sr.uploaded_by 
    ORDER BY sr.created_at DESC 
    LIMIT ? OFFSET ?
  `, [parseInt(limit, 10), parseInt(offset, 10)]);
  return { resources: rows, total: countRows[0].total };
}

module.exports = {
  create,
  findByCourse,
  findById,
  remove,
  getAll
};
