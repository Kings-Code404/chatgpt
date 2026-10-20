'use strict';
const express        = require('express');
const router         = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const courseCtrl     = require('../controllers/courseController');
const resourceCtrl   = require('../controllers/resourceController');
const examCtrl       = require('../controllers/examController');
const notifCtrl      = require('../controllers/notificationController');
const feedbackCtrl   = require('../controllers/feedbackController');
const userCtrl       = require('../controllers/userController');
const upload         = require('../config/multer');

const courseModel    = require('../models/courseModel');
const examModel      = require('../models/examModel');
const pool           = require('../config/db');

// All teacher routes require auth + teacher role
router.use(requireAuth, requireRole('teacher'));

// Dashboard with real database metrics
router.get('/dashboard', async (req, res, next) => {
  try {
    const teacherId = req.session.user.id;
    const courses = await courseModel.getCoursesForTeacher(teacherId);
    const exams = await examModel.findByTeacher(teacherId);

    // Calculate total students enrolled across teacher's courses
    let totalStudents = 0;
    if (courses.length > 0) {
      const courseIds = courses.map(c => c.id);
      const [stuCount] = await pool.query(
        `SELECT COUNT(DISTINCT student_id) as cnt FROM enrollments WHERE course_id IN (?)`,
        [courseIds]
      );
      totalStudents = stuCount[0].cnt;
    }

    // Get recent student exam submissions and total submissions count
    const [subCount] = await pool.query(`
      SELECT COUNT(*) as cnt
      FROM exam_attempts ea
      JOIN exams e ON e.id = ea.exam_id
      JOIN courses c ON c.id = e.course_id
      JOIN teacher_course_assignments tca ON tca.course_id = c.id
      WHERE tca.teacher_id = ?
    `, [teacherId]);
    const totalSubmissions = subCount[0]?.cnt || 0;

    const [recentAttempts] = await pool.query(`
      SELECT ea.*, u.full_name as student_name, e.title as exam_title, e.total_marks, e.pass_marks
      FROM exam_attempts ea
      JOIN exams e ON e.id = ea.exam_id
      JOIN users u ON u.id = ea.student_id
      JOIN courses c ON c.id = e.course_id
      JOIN teacher_course_assignments tca ON tca.course_id = c.id
      WHERE tca.teacher_id = ?
      ORDER BY ea.started_at DESC LIMIT 5
    `, [teacherId]);

    res.render('teacher/dashboard', {
      title: 'Teacher Dashboard',
      courses,
      exams,
      totalStudents,
      totalSubmissions,
      recentAttempts
    });
  } catch (err) {
    next(err);
  }
});

// Profile
router.get('/profile',   userCtrl.showProfile);
router.post('/profile',  userCtrl.updateProfile);

// Courses (view assigned)
router.get('/courses',       courseCtrl.listTeacherCourses);
router.get('/courses/:id',   courseCtrl.getCourse);

// Resources
router.get('/courses/:courseId/resources',        resourceCtrl.listResources);
router.get('/courses/:courseId/resources/upload', resourceCtrl.uploadForm);
router.post('/courses/:courseId/resources',       upload.single('resource_file'), resourceCtrl.uploadResource);
router.delete('/resources/:id',                   resourceCtrl.deleteResource);

// Exams
const { examValidation, questionValidation } = require('../validators/examValidator');
router.get('/exams',                    examCtrl.listTeacherExams);
router.get('/exams/new',                examCtrl.createExamForm);
router.post('/exams',                   examValidation, examCtrl.createExam);
router.get('/exams/:id/edit',           examCtrl.editExamForm);
router.post('/exams/:id',               examValidation, examCtrl.updateExam);
router.delete('/exams/:id',             examCtrl.deleteExam);
router.get('/exams/:id/questions/new',  examCtrl.addQuestionForm);
router.post('/exams/:id/questions',     questionValidation, examCtrl.addQuestion);
router.delete('/questions/:id',         examCtrl.deleteQuestion);

// Results
router.get('/exams/:examId/results',    examCtrl.viewExamResults);

// Notifications
router.get('/notifications',            notifCtrl.listNotifications);
router.post('/notifications/:id/read',  notifCtrl.markRead);
router.post('/notifications/read-all',  notifCtrl.markAllRead);

// Feedback (see feedback on their courses)
router.get('/feedback',                 feedbackCtrl.listCourseFeedback);

module.exports = router;
