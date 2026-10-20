'use strict';
const pool = require('../config/db');

async function create(data) {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const [result] = await pool.query(
    `INSERT INTO exams (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
    values
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await pool.query(`
    SELECT e.*, c.title as course_title, c.code as course_code 
    FROM exams e 
    JOIN courses c ON c.id=e.course_id 
    WHERE e.id=?
  `, [id]);
  return rows[0];
}

async function findByCourse(courseId) {
  const [rows] = await pool.query('SELECT * FROM exams WHERE course_id=? ORDER BY created_at DESC', [courseId]);
  return rows;
}

async function findByTeacher(teacherId) {
  const [rows] = await pool.query(`
    SELECT e.*, c.title as course_title, c.code as course_code
    FROM exams e
    JOIN courses c ON c.id = e.course_id
    JOIN teacher_course_assignments tca ON tca.course_id = c.id
    WHERE tca.teacher_id = ? OR e.created_by = ?
    ORDER BY e.created_at DESC
  `, [teacherId, teacherId]);
  return rows;
}

async function update(id, data) {
  const fields = Object.keys(data);
  if (fields.length === 0) return;
  const values = Object.values(data);
  const setClauses = fields.map(f => `${f}=?`).join(', ');
  await pool.query(`UPDATE exams SET ${setClauses} WHERE id=?`, [...values, id]);
}

async function remove(id) {
  await pool.query('DELETE FROM exams WHERE id=?', [id]);
}

async function getAll(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query('SELECT COUNT(*) as total FROM exams');
  const [rows] = await pool.query(`
    SELECT e.*, c.title as course_title, c.code as course_code, u.full_name as creator_name
    FROM exams e 
    JOIN courses c ON c.id = e.course_id 
    LEFT JOIN users u ON u.id = e.created_by
    ORDER BY e.created_at DESC LIMIT ? OFFSET ?
  `, [parseInt(limit, 10), parseInt(offset, 10)]);
  return { exams: rows, total: countRows[0].total };
}

async function getAvailableForStudent(studentId) {
  const [rows] = await pool.query(`
    SELECT e.*, c.title as course_title, c.code as course_code,
      (SELECT COUNT(*) FROM exam_attempts ea WHERE ea.exam_id = e.id AND ea.student_id = ?) as attempts_count,
      (SELECT MAX(score) FROM exam_attempts ea WHERE ea.exam_id = e.id AND ea.student_id = ?) as best_score
    FROM exams e 
    JOIN courses c ON c.id = e.course_id
    JOIN enrollments en ON en.course_id = c.id
    WHERE en.student_id = ? AND en.status = 'active' AND e.status = 'published'
      AND (e.start_time IS NULL OR NOW() >= e.start_time)
      AND (e.end_time IS NULL OR NOW() <= e.end_time)
    ORDER BY e.created_at DESC
  `, [studentId, studentId, studentId]);
  return rows;
}

async function createQuestion({ exam_id, question_text, question_type, marks, order_index }) {
  const [result] = await pool.query(
    'INSERT INTO questions (exam_id, question_text, question_type, marks, order_index) VALUES (?, ?, ?, ?, ?)',
    [exam_id, question_text, question_type, marks || 1, order_index || 1]
  );
  return result.insertId;
}

async function createOption({ question_id, option_text, is_correct, order_index }) {
  const [result] = await pool.query(
    'INSERT INTO question_options (question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?)',
    [question_id, option_text, is_correct ? 1 : 0, order_index || 1]
  );
  return result.insertId;
}

async function getQuestionsWithOptions(examId, { includeCorrect = true } = {}) {
  const [questions] = await pool.query(
    'SELECT * FROM questions WHERE exam_id=? ORDER BY order_index ASC, id ASC',
    [examId]
  );
  for (let q of questions) {
    if (q.question_type !== 'short_answer') {
      const optionColumns = includeCorrect
        ? 'id, question_id, option_text, is_correct, order_index'
        : 'id, question_id, option_text, order_index';
      const [options] = await pool.query(
        `SELECT ${optionColumns} FROM question_options WHERE question_id=? ORDER BY order_index ASC, id ASC`,
        [q.id]
      );
      q.options = options;
    } else {
      q.options = [];
    }
  }
  return questions;
}

async function isManagedByTeacher(examId, teacherId) {
  const [rows] = await pool.query(`
    SELECT e.id
    FROM exams e
    LEFT JOIN teacher_course_assignments tca ON tca.course_id = e.course_id
    WHERE e.id = ? AND (e.created_by = ? OR tca.teacher_id = ?)
    LIMIT 1
  `, [examId, teacherId, teacherId]);
  return rows.length > 0;
}

async function deleteQuestion(id) {
  await pool.query('DELETE FROM questions WHERE id=?', [id]);
}

async function deleteOption(id) {
  await pool.query('DELETE FROM question_options WHERE id=?', [id]);
}

module.exports = {
  create,
  findById,
  findByCourse,
  findByTeacher,
  update,
  remove,
  getAll,
  getAvailableForStudent,
  createQuestion,
  createOption,
  getQuestionsWithOptions,
  isManagedByTeacher,
  deleteQuestion,
  deleteOption
};
