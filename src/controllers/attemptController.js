'use strict';
const attemptModel = require('../models/attemptModel');
const examModel = require('../models/examModel');
const enrollmentModel = require('../models/enrollmentModel');

// Start an exam attempt
exports.startExam = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    const studentId = req.session.user.id;

    const exam = await examModel.findById(examId);
    if (!exam) {
      req.flash('error', 'Exam not found.');
      return res.redirect('/student/exams');
    }

    if (exam.status !== 'published') {
      req.flash('error', 'This exam is not available yet.');
      return res.redirect('/student/exams');
    }

    // Verify enrollment
    const isEnrolled = await enrollmentModel.isEnrolled(studentId, exam.course_id);
    if (!isEnrolled) {
      req.flash('error', 'You must be enrolled in this course to take the exam.');
      return res.redirect('/student/exams');
    }

    // Check if there is an active in_progress attempt
    let activeAttempt = await attemptModel.findActiveAttempt(studentId, examId);
    if (activeAttempt) {
      return res.redirect(`/student/attempts/${activeAttempt.id}/take`);
    }

    // Check attempt limit
    const attemptsCount = await attemptModel.countAttempts(studentId, examId);
    if (attemptsCount >= exam.attempt_limit) {
      req.flash('error', `You have reached the maximum attempt limit (${exam.attempt_limit}) for this exam.`);
      return res.redirect('/student/exams');
    }

    // Check time window
    const now = new Date();
    if (exam.start_time && new Date(exam.start_time) > now) {
      req.flash('error', 'This exam has not started yet.');
      return res.redirect('/student/exams');
    }
    if (exam.end_time && new Date(exam.end_time) < now) {
      req.flash('error', 'This exam has already closed.');
      return res.redirect('/student/exams');
    }

    const newAttempt = await attemptModel.startAttempt(examId, studentId);
    res.redirect(`/student/attempts/${newAttempt.id}/take`);
  } catch (err) {
    next(err);
  }
};

// Take exam screen
exports.takeExam = async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId;
    const studentId = req.session.user.id;

    const attempt = await attemptModel.findById(attemptId);
    if (!attempt || attempt.student_id !== studentId) {
      req.flash('error', 'Exam attempt not found or access denied.');
      return res.redirect('/student/exams');
    }

    if (attempt.status !== 'in_progress') {
      req.flash('info', 'This exam has already been submitted.');
      return res.redirect(`/student/results/${attemptId}`);
    }

    const exam = await examModel.findById(attempt.exam_id);
    // Never expose correct-answer flags to a student before submission.
    const questions = await examModel.getQuestionsWithOptions(exam.id, { includeCorrect: false });
    const savedAnswers = await attemptModel.getAnswers(attemptId, { includeCorrect: false });

    // Map existing answers by question_id for easy pre-filling
    const answersMap = {};
    savedAnswers.forEach(a => {
      answersMap[a.question_id] = a;
    });

    // Server-enforced remaining duration calculation
    const startTime = new Date(attempt.started_at).getTime();
    const durationMs = exam.duration_minutes * 60 * 1000;
    const elapsedMs = Date.now() - startTime;
    const remainingSeconds = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));

    // If time is up, auto-submit
    if (remainingSeconds <= 0) {
      await attemptModel.submitAndGrade(attemptId);
      req.flash('info', 'Time has expired! Your exam was automatically submitted.');
      return res.redirect(`/student/results/${attemptId}`);
    }

    res.render('student/exam-take', {
      title: `Exam: ${exam.title}`,
      attempt,
      exam,
      questions,
      answersMap,
      remainingSeconds
    });
  } catch (err) {
    next(err);
  }
};

// Save a single answer (supports AJAX auto-save)
exports.saveAnswer = async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId;
    const { questionId, selectedOption, textAnswer } = req.body;

    const attempt = await attemptModel.findById(attemptId);
    if (!attempt || attempt.student_id !== req.session.user.id || attempt.status !== 'in_progress') {
      return res.status(403).json({ success: false, message: 'Invalid attempt.' });
    }

    if (Date.now() >= new Date(attempt.started_at).getTime() + attempt.duration_minutes * 60 * 1000) {
      await attemptModel.submitAndGrade(attemptId);
      return res.status(409).json({ success: false, message: 'The exam time has expired and the attempt was submitted.' });
    }

    await attemptModel.saveAnswer(attemptId, questionId, { selectedOption, textAnswer });

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true });
    }
    res.redirect('back');
  } catch (err) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(err.status || 500).json({
        success: false,
        error: err.status ? err.message : 'Unable to save this answer right now.'
      });
    }
    next(err);
  }
};

// Submit full exam
exports.submitExam = async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId;
    const attempt = await attemptModel.findById(attemptId);

    if (!attempt || attempt.student_id !== req.session.user.id) {
      req.flash('error', 'Invalid exam attempt.');
      return res.redirect('/student/exams');
    }

    if (attempt.status === 'in_progress') {
      const deadline = new Date(attempt.started_at).getTime() + attempt.duration_minutes * 60 * 1000;
      if (Date.now() >= deadline) {
        const result = await attemptModel.submitAndGrade(attemptId);
        req.flash('info', `Time expired. Your exam was submitted. Score: ${result.score}`);
        return res.redirect(`/student/results/${attemptId}`);
      }
      // Save any submitted form answers from POST body if present
      const answers = req.body.answers;
      if (answers && typeof answers === 'object') {
        for (const [qId, val] of Object.entries(answers)) {
          if (typeof val === 'string' && val.startsWith('opt_')) {
            const optId = val.replace('opt_', '');
            await attemptModel.saveAnswer(attemptId, qId, { selectedOption: optId });
          } else {
            await attemptModel.saveAnswer(attemptId, qId, { textAnswer: val });
          }
        }
      }

      const result = await attemptModel.submitAndGrade(attemptId);
      req.flash('success', `Exam submitted successfully! Score: ${result.score}`);
    }

    res.redirect(`/student/results/${attemptId}`);
  } catch (err) {
    next(err);
  }
};

// Student: List all past exam attempts & results
exports.listResults = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const attempts = await attemptModel.getForStudent(studentId);

    res.render('student/results', {
      title: 'My Exam Results',
      attempts
    });
  } catch (err) {
    next(err);
  }
};

// Student / Teacher / Admin: View specific attempt results
exports.viewResult = async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId || req.params.id;
    const attempt = await attemptModel.findById(attemptId);

    if (!attempt) {
      req.flash('error', 'Attempt not found.');
      return res.redirect('/student/results');
    }

    const user = req.session.user;
    if (user.role === 'student' && attempt.student_id !== user.id) {
      req.flash('error', 'Access denied. You can only view your own results.');
      return res.redirect('/student/results');
    }

    const answers = await attemptModel.getAnswers(attemptId);
    const questions = await examModel.getQuestionsWithOptions(attempt.exam_id);

    res.render('student/result-detail', {
      title: `Result: ${attempt.exam_title}`,
      attempt,
      answers,
      questions
    });
  } catch (err) {
    next(err);
  }
};

// Admin: System-wide results list
exports.adminListAttempts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const { attempts, total } = await attemptModel.getAll(page, limit);

    res.render('admin/results', {
      title: 'Exam Results & Attempts Oversight',
      attempts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
};

exports.adminViewAttempt = exports.viewResult;
