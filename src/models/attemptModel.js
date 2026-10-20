'use strict';
const pool = require('../config/db');

async function countAttempts(studentId, examId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) as count FROM exam_attempts WHERE student_id=? AND exam_id=?',
    [studentId, examId]
  );
  return rows[0].count;
}

async function startAttempt(examId, studentId) {
  const [result] = await pool.query(
    'INSERT INTO exam_attempts (exam_id, student_id, started_at, status) VALUES (?, ?, NOW(), "in_progress")',
    [examId, studentId]
  );
  return { id: result.insertId };
}

async function findById(id) {
  const [rows] = await pool.query(`
    SELECT ea.*, e.title as exam_title, e.duration_minutes, e.total_marks, e.pass_marks,
           e.course_id, c.title as course_title, c.code as course_code,
           u.full_name as student_name, u.email as student_email
    FROM exam_attempts ea
    JOIN exams e ON e.id = ea.exam_id
    JOIN courses c ON c.id = e.course_id
    JOIN users u ON u.id = ea.student_id
    WHERE ea.id=?
  `, [id]);
  return rows[0];
}

async function saveAnswer(attemptId, questionId, { selectedOption, textAnswer }) {
  const [attemptRows] = await pool.query(
    'SELECT exam_id FROM exam_attempts WHERE id=? AND status="in_progress"',
    [attemptId]
  );
  if (!attemptRows.length) {
    const error = new Error('This exam attempt is no longer accepting answers.');
    error.status = 409;
    throw error;
  }

  const [questionRows] = await pool.query(
    'SELECT id, question_type FROM questions WHERE id=? AND exam_id=?',
    [questionId, attemptRows[0].exam_id]
  );
  if (!questionRows.length) {
    const error = new Error('The selected question does not belong to this exam.');
    error.status = 400;
    throw error;
  }

  if (selectedOption) {
    const [optionRows] = await pool.query(
      'SELECT id FROM question_options WHERE id=? AND question_id=?',
      [selectedOption, questionId]
    );
    if (!optionRows.length || questionRows[0].question_type === 'short_answer') {
      const error = new Error('The selected option is invalid for this question.');
      error.status = 400;
      throw error;
    }
  }

  await pool.query(`
    INSERT INTO attempt_answers (attempt_id, question_id, selected_option, text_answer) 
    VALUES (?, ?, ?, ?) 
    ON DUPLICATE KEY UPDATE selected_option=VALUES(selected_option), text_answer=VALUES(text_answer)
  `, [attemptId, questionId, selectedOption || null, textAnswer || null]);
}

async function getAnswers(attemptId, { includeCorrect = true } = {}) {
  const selectedCorrectness = includeCorrect ? ', qo.is_correct as selected_is_correct' : '';
  const [rows] = await pool.query(`
    SELECT aa.*, q.question_text, q.question_type, q.marks as max_marks,
           qo.option_text as selected_option_text${selectedCorrectness}
    FROM attempt_answers aa 
    JOIN questions q ON q.id = aa.question_id 
    LEFT JOIN question_options qo ON qo.id = aa.selected_option
    WHERE aa.attempt_id=?
    ORDER BY q.order_index ASC
  `, [attemptId]);
  return rows;
}

async function submitAndGrade(attemptId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [attemptRows] = await connection.query(
      'SELECT id FROM exam_attempts WHERE id=? AND status="in_progress" FOR UPDATE',
      [attemptId]
    );
    if (!attemptRows.length) {
      const error = new Error('This exam attempt has already been submitted.');
      error.status = 409;
      throw error;
    }
    const [answers] = await connection.query(`
      SELECT aa.id as answer_id, aa.question_id, aa.selected_option, aa.text_answer,
             q.marks, q.question_type,
             qo.is_correct as option_is_correct
      FROM attempt_answers aa
      JOIN questions q ON q.id = aa.question_id
      LEFT JOIN question_options qo ON qo.id = aa.selected_option
      WHERE aa.attempt_id=?
    `, [attemptId]);

    let totalScore = 0;
    for (const ans of answers) {
      if (ans.question_type === 'mcq' || ans.question_type === 'true_false') {
        const isCorrect = Number(ans.option_is_correct) === 1 ? 1 : 0;
        const marksAwarded = isCorrect ? Number(ans.marks) : 0;
        await connection.query(
          'UPDATE attempt_answers SET is_correct=?, marks_awarded=? WHERE id=?',
          [isCorrect, marksAwarded, ans.answer_id]
        );
        totalScore += marksAwarded;
      } else {
        await connection.query(
          'UPDATE attempt_answers SET is_correct=NULL, marks_awarded=0 WHERE id=?',
          [ans.answer_id]
        );
      }
    }

    await connection.query(
      'UPDATE exam_attempts SET score=?, status="submitted", submitted_at=NOW() WHERE id=?',
      [totalScore, attemptId]
    );
    await connection.commit();
    return { score: totalScore, status: 'submitted' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getForStudent(studentId) {
  const [rows] = await pool.query(`
    SELECT ea.*, e.title as exam_title, e.total_marks, e.pass_marks,
           c.title as course_title, c.code as course_code
    FROM exam_attempts ea 
    JOIN exams e ON e.id = ea.exam_id 
    JOIN courses c ON c.id = e.course_id 
    WHERE ea.student_id=?
    ORDER BY ea.started_at DESC
  `, [studentId]);
  return rows;
}

async function getForExam(examId) {
  const [rows] = await pool.query(`
    SELECT ea.*, u.full_name as student_name, u.email as student_email,
           e.title as exam_title, e.total_marks, e.pass_marks
    FROM exam_attempts ea 
    JOIN users u ON u.id = ea.student_id 
    JOIN exams e ON e.id = ea.exam_id
    WHERE ea.exam_id=?
    ORDER BY ea.submitted_at DESC, ea.started_at DESC
  `, [examId]);
  return rows;
}

async function getAll(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query('SELECT COUNT(*) as total FROM exam_attempts');
  const [rows] = await pool.query(`
    SELECT ea.*, u.full_name as student_name, u.email as student_email,
           e.title as exam_title, e.total_marks, e.pass_marks,
           c.title as course_title, c.code as course_code
    FROM exam_attempts ea 
    JOIN users u ON u.id = ea.student_id 
    JOIN exams e ON e.id = ea.exam_id 
    JOIN courses c ON c.id = e.course_id
    ORDER BY ea.started_at DESC 
    LIMIT ? OFFSET ?
  `, [parseInt(limit, 10), parseInt(offset, 10)]);
  return { attempts: rows, total: countRows[0].total };
}

async function findActiveAttempt(studentId, examId) {
  const [rows] = await pool.query(
    'SELECT * FROM exam_attempts WHERE student_id=? AND exam_id=? AND status="in_progress" ORDER BY started_at DESC LIMIT 1',
    [studentId, examId]
  );
  return rows[0];
}

module.exports = {
  countAttempts,
  startAttempt,
  findById,
  saveAnswer,
  getAnswers,
  submitAndGrade,
  getForStudent,
  getForExam,
  getAll,
  findActiveAttempt
};
