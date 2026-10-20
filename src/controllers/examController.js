'use strict';
const examModel = require('../models/examModel');
const courseModel = require('../models/courseModel');
const attemptModel = require('../models/attemptModel');
const pool = require('../config/db');

async function teacherCanManageExam(req, res, examId) {
  if (req.session.user.role !== 'teacher') return true;
  const allowed = await examModel.isManagedByTeacher(examId, req.session.user.id);
  if (allowed) return true;
  res.status(403).render('errors/403', { title: 'Access Denied' });
  return false;
}

function examSettingsError(body) {
  const totalMarks = parseInt(body.total_marks, 10) || 100;
  const passMarks = parseInt(body.pass_marks, 10) || 40;
  const attempts = parseInt(body.attempt_limit, 10) || 1;
  if (passMarks > totalMarks) return 'Pass marks cannot exceed total marks.';
  if (attempts < 1 || attempts > 10) return 'Attempt limit must be between 1 and 10.';
  if (body.status && !['draft', 'published', 'closed'].includes(body.status)) return 'Select a valid exam status.';
  if (body.start_time && Number.isNaN(Date.parse(body.start_time))) return 'Enter a valid exam start time.';
  if (body.end_time && Number.isNaN(Date.parse(body.end_time))) return 'Enter a valid exam end time.';
  if (body.start_time && body.end_time && Date.parse(body.end_time) <= Date.parse(body.start_time)) {
    return 'Exam end time must be after the start time.';
  }
  return null;
}

// Student: List available exams for enrolled courses
exports.listAvailableExams = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const exams = await examModel.getAvailableForStudent(studentId);

    res.render('student/exams', {
      title: 'Online Examinations',
      exams
    });
  } catch (err) {
    next(err);
  }
};

// Teacher: List exams
exports.listTeacherExams = async (req, res, next) => {
  try {
    const teacherId = req.session.user.id;
    const exams = await examModel.findByTeacher(teacherId);

    // Get questions count and attempts count for each exam
    for (const e of exams) {
      const [qCnt] = await pool.query('SELECT COUNT(*) as cnt FROM questions WHERE exam_id=?', [e.id]);
      const [aCnt] = await pool.query('SELECT COUNT(*) as cnt FROM exam_attempts WHERE exam_id=?', [e.id]);
      e.questionCount = qCnt[0].cnt;
      e.attemptCount = aCnt[0].cnt;
    }

    res.render('teacher/exams', {
      title: 'Manage Examinations',
      exams
    });
  } catch (err) {
    next(err);
  }
};

// Teacher: Create exam form
exports.createExamForm = async (req, res, next) => {
  try {
    const teacherId = req.session.user.id;
    const courses = await courseModel.getCoursesForTeacher(teacherId);
    res.render('teacher/exam-create', {
      title: 'Create New Examination',
      courses
    });
  } catch (err) {
    next(err);
  }
};

// Teacher: Handle exam creation
exports.createExam = async (req, res, next) => {
  try {
    const { course_id, title, description, duration_minutes, total_marks, pass_marks, start_time, end_time, status, attempt_limit } = req.body;

    if (!course_id || !title || !duration_minutes) {
      req.flash('error', 'Course, Title, and Duration are required.');
      return res.redirect('/teacher/exams/new');
    }
    const settingsError = examSettingsError(req.body);
    if (settingsError) {
      req.flash('error', settingsError);
      return res.redirect('/teacher/exams/new');
    }
    if (!(await courseModel.isAssignedToTeacher(course_id, req.session.user.id))) {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }

    const examId = await examModel.create({
      course_id,
      created_by: req.session.user.id,
      title: title.trim(),
      description: description ? description.trim() : '',
      duration_minutes: parseInt(duration_minutes, 10) || 60,
      total_marks: parseInt(total_marks, 10) || 100,
      pass_marks: parseInt(pass_marks, 10) || 40,
      start_time: start_time || null,
      end_time: end_time || null,
      status: status || 'draft',
      attempt_limit: parseInt(attempt_limit, 10) || 1
    });

    req.flash('success', 'Exam created. You can now add questions.');
    res.redirect(`/teacher/exams/${examId}/questions/new`);
  } catch (err) {
    next(err);
  }
};

// Teacher: Edit exam form
exports.editExamForm = async (req, res, next) => {
  try {
    const exam = await examModel.findById(req.params.id);
    if (!exam) {
      req.flash('error', 'Exam not found.');
      return res.redirect('/teacher/exams');
    }
    if (!(await teacherCanManageExam(req, res, exam.id))) return;
    const courses = await courseModel.getCoursesForTeacher(req.session.user.id);
    res.render('teacher/exam-edit', {
      title: `Edit Exam: ${exam.title}`,
      exam,
      courses
    });
  } catch (err) {
    next(err);
  }
};

// Teacher: Update exam
exports.updateExam = async (req, res, next) => {
  try {
    const { course_id, title, description, duration_minutes, total_marks, pass_marks, start_time, end_time, status, attempt_limit } = req.body;
    const existingExam = await examModel.findById(req.params.id);
    if (!existingExam) {
      req.flash('error', 'Exam not found.');
      return res.redirect('/teacher/exams');
    }
    const settingsError = examSettingsError(req.body);
    if (settingsError) {
      req.flash('error', settingsError);
      return res.redirect(`/teacher/exams/${encodeURIComponent(req.params.id)}/edit`);
    }
    if (!(await teacherCanManageExam(req, res, existingExam.id))) return;
    if (!(await courseModel.isAssignedToTeacher(course_id, req.session.user.id))) {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }
    await examModel.update(req.params.id, {
      course_id,
      title: title.trim(),
      description: description ? description.trim() : '',
      duration_minutes: parseInt(duration_minutes, 10) || 60,
      total_marks: parseInt(total_marks, 10) || 100,
      pass_marks: parseInt(pass_marks, 10) || 40,
      start_time: start_time || null,
      end_time: end_time || null,
      status: status || 'draft',
      attempt_limit: parseInt(attempt_limit, 10) || 1
    });

    req.flash('success', 'Exam updated successfully.');
    res.redirect('/teacher/exams');
  } catch (err) {
    next(err);
  }
};

// Delete exam (Teacher or Admin)
exports.deleteExam = async (req, res, next) => {
  try {
    if (!(await teacherCanManageExam(req, res, req.params.id))) return;
    await examModel.remove(req.params.id);
    req.flash('success', 'Exam deleted successfully.');
    res.redirect('back');
  } catch (err) {
    next(err);
  }
};

// Question management view
exports.addQuestionForm = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const exam = await examModel.findById(examId);
    if (!exam) {
      req.flash('error', 'Exam not found.');
      return res.redirect('/teacher/exams');
    }
    if (!(await teacherCanManageExam(req, res, exam.id))) return;

    const questions = await examModel.getQuestionsWithOptions(examId);

    res.render('teacher/exam-questions', {
      title: `Questions for ${exam.title}`,
      exam,
      questions
    });
  } catch (err) {
    next(err);
  }
};

// Add question + options
exports.addQuestion = async (req, res, next) => {
  try {
    const examId = req.params.id;
    if (!(await teacherCanManageExam(req, res, examId))) return;
    const { question_text, question_type, marks, order_index, options, correct_option } = req.body;

    if (!question_text) {
      req.flash('error', 'Question text is required.');
      return res.redirect('back');
    }

    const exam = await examModel.findById(examId);
    if (!exam) {
      req.flash('error', 'Exam not found.');
      return res.redirect('/teacher/exams');
    }
    const questionMarks = parseInt(marks, 10) || 1;
    const currentQuestions = await examModel.getQuestionsWithOptions(examId);
    const assignedMarks = currentQuestions.reduce((total, question) => total + Number(question.marks || 0), 0);
    if (assignedMarks + questionMarks > exam.total_marks) {
      req.flash('error', `Question marks cannot exceed this exam's total marks (${exam.total_marks}).`);
      return res.redirect('back');
    }
    if (question_type === 'mcq') {
      const validOptions = Array.isArray(options) ? options.map(option => typeof option === 'string' ? option.trim() : '') : [];
      const correctIndex = Number(correct_option);
      if (validOptions.filter(Boolean).length < 2 || !Number.isInteger(correctIndex) || !validOptions[correctIndex]) {
        req.flash('error', 'Provide at least two options and select a non-empty correct option.');
        return res.redirect('back');
      }
    }
    if (question_type === 'true_false' && !['True', 'False'].includes(req.body.tf_correct)) {
      req.flash('error', 'Select True or False as the correct answer.');
      return res.redirect('back');
    }

    const qId = await examModel.createQuestion({
      exam_id: examId,
      question_text: question_text.trim(),
      question_type: question_type || 'mcq',
      marks: questionMarks,
      order_index: parseInt(order_index, 10) || 0
    });

    // Add options for MCQ or True/False
    if (question_type === 'mcq' && Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        const optText = typeof options[i] === 'string' ? options[i].trim() : '';
        if (optText) {
          const isCorrect = (parseInt(correct_option, 10) === i) ? 1 : 0;
          await examModel.createOption({
            question_id: qId,
            option_text: optText,
            is_correct: isCorrect,
            order_index: i + 1
          });
        }
      }
    } else if (question_type === 'true_false') {
      const correctVal = req.body.tf_correct || 'True';
      await examModel.createOption({
        question_id: qId,
        option_text: 'True',
        is_correct: correctVal === 'True' ? 1 : 0,
        order_index: 1
      });
      await examModel.createOption({
        question_id: qId,
        option_text: 'False',
        is_correct: correctVal === 'False' ? 1 : 0,
        order_index: 2
      });
    }

    req.flash('success', 'Question added successfully.');
    res.redirect(`/teacher/exams/${examId}/questions/new`);
  } catch (err) {
    next(err);
  }
};

// Delete question
exports.deleteQuestion = async (req, res, next) => {
  try {
    // Resolve the owning exam before allowing a teacher to delete a question.
    const [rows] = await pool.query('SELECT exam_id FROM questions WHERE id=?', [req.params.id]);
    if (!rows.length) {
      req.flash('error', 'Question not found.');
      return res.redirect('/teacher/exams');
    }
    if (!(await teacherCanManageExam(req, res, rows[0].exam_id))) return;
    await examModel.deleteQuestion(req.params.id);
    req.flash('success', 'Question deleted.');
    res.redirect('back');
  } catch (err) {
    next(err);
  }
};

// Teacher / Admin: view student results for an exam
exports.viewExamResults = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    const exam = await examModel.findById(examId);
    if (!exam) {
      req.flash('error', 'Exam not found.');
      return res.redirect('back');
    }
    if (!(await teacherCanManageExam(req, res, exam.id))) return;

    const attempts = await attemptModel.getForExam(examId);

    res.render('teacher/exam-results', {
      title: `Results for ${exam.title}`,
      exam,
      attempts
    });
  } catch (err) {
    next(err);
  }
};

// Admin: List all exams
exports.adminListExams = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const { exams, total } = await examModel.getAll(page, limit);

    res.render('admin/exams', {
      title: 'Exam Management',
      exams,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
};
