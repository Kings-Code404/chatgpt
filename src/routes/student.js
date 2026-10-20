'use strict';
const express        = require('express');
const router         = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const courseCtrl     = require('../controllers/courseController');
const enrollCtrl     = require('../controllers/enrollmentController');
const resourceCtrl   = require('../controllers/resourceController');
const examCtrl       = require('../controllers/examController');
const attemptCtrl    = require('../controllers/attemptController');
const notifCtrl      = require('../controllers/notificationController');
const feedbackCtrl   = require('../controllers/feedbackController');
const userCtrl       = require('../controllers/userController');

const enrollmentModel   = require('../models/enrollmentModel');
const examModel         = require('../models/examModel');
const attemptModel      = require('../models/attemptModel');
const notificationModel = require('../models/notificationModel');

// All student routes require auth + student role
router.use(requireAuth, requireRole('student'));

// Dashboard with real database metrics
router.get('/dashboard', async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const enrollments = await enrollmentModel.getEnrollmentsForStudent(studentId);
    const availableExams = await examModel.getAvailableForStudent(studentId);
    const recentAttempts = await attemptModel.getForStudent(studentId);
    const notifData = await notificationModel.getForUser(studentId, 1, 5);

    res.render('student/dashboard', {
      title: 'Student Dashboard',
      enrollments,
      availableExams,
      recentAttempts,
      unreadNotifs: notifData.unreadCount
    });
  } catch (err) {
    next(err);
  }
});

// Profile
router.get('/profile',       userCtrl.showProfile);
router.post('/profile',      userCtrl.updateProfile);

// Courses
router.get('/courses',       courseCtrl.listCourses);
router.get('/courses/:id',   courseCtrl.getCourse);
router.post('/courses/:id/enroll', enrollCtrl.enroll);
router.post('/courses/:id/drop',   enrollCtrl.drop);

// Study Resources
router.get('/courses/:courseId/resources', resourceCtrl.listResources);
router.get('/resources/:id/download',      resourceCtrl.downloadResource);

// Exams
router.get('/exams',                       examCtrl.listAvailableExams);
router.post('/exams/:examId/start',        attemptCtrl.startExam);
router.get('/attempts/:attemptId/take',    attemptCtrl.takeExam);
router.post('/attempts/:attemptId/save',   attemptCtrl.saveAnswer);
router.post('/attempts/:attemptId/submit', attemptCtrl.submitExam);

// Results
router.get('/results',                     attemptCtrl.listResults);
router.get('/results/:attemptId',          attemptCtrl.viewResult);

// Notifications
router.get('/notifications',               notifCtrl.listNotifications);
router.post('/notifications/:id/read',     notifCtrl.markRead);
router.post('/notifications/read-all',     notifCtrl.markAllRead);

// Feedback
const { feedbackValidation } = require('../validators/feedbackValidator');
router.get('/feedback/:courseId/new',      feedbackCtrl.submitFeedbackForm);
router.post('/feedback/:courseId',         feedbackValidation, feedbackCtrl.submitFeedback);
router.get('/feedback',                    feedbackCtrl.listStudentFeedback);

module.exports = router;
