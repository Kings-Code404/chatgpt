'use strict';
const express        = require('express');
const router         = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const userCtrl       = require('../controllers/userController');
const courseCtrl     = require('../controllers/courseController');
const enrollCtrl     = require('../controllers/enrollmentController');
const resourceCtrl   = require('../controllers/resourceController');
const examCtrl       = require('../controllers/examController');
const attemptCtrl    = require('../controllers/attemptController');
const notifCtrl      = require('../controllers/notificationController');
const feedbackCtrl   = require('../controllers/feedbackController');
const pool           = require('../config/db');

// All admin routes require auth + admin role
router.use(requireAuth, requireRole('admin'));

// Dashboard with real institutional metrics
router.get('/dashboard', async (req, res, next) => {
  try {
    const [userStats] = await pool.query(`
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN r.name='student' THEN 1 ELSE 0 END) as totalStudents,
        SUM(CASE WHEN r.name='teacher' THEN 1 ELSE 0 END) as totalTeachers,
        SUM(CASE WHEN r.name='admin' THEN 1 ELSE 0 END) as totalAdmins
      FROM users u
      JOIN roles r ON r.id = u.role_id
    `);

    const [courseStats] = await pool.query('SELECT COUNT(*) as totalCourses FROM courses');
    const [enrollStats] = await pool.query('SELECT COUNT(*) as totalEnrollments FROM enrollments');
    const [examStats]   = await pool.query('SELECT COUNT(*) as totalExams FROM exams');
    const [resStats]    = await pool.query('SELECT COUNT(*) as totalResources FROM study_resources');

    // Recent registered users
    const [recentUsers] = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u 
      JOIN roles r ON r.id = u.role_id 
      ORDER BY u.created_at DESC LIMIT 5
    `);

    // Recent courses
    const [recentCourses] = await pool.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as student_count
      FROM courses c 
      ORDER BY c.created_at DESC LIMIT 5
    `);

    res.render('admin/dashboard', {
      title: 'Administrator Dashboard',
      stats: {
        users: userStats[0].totalUsers,
        students: userStats[0].totalStudents,
        teachers: userStats[0].totalTeachers,
        admins: userStats[0].totalAdmins,
        courses: courseStats[0].totalCourses,
        enrollments: enrollStats[0].totalEnrollments,
        exams: examStats[0].totalExams,
        resources: resStats[0].totalResources
      },
      recentUsers,
      recentCourses
    });
  } catch (err) {
    next(err);
  }
});

// Profile
router.get('/profile',       userCtrl.showProfile);
router.post('/profile',      userCtrl.updateProfile);

// Users
router.get('/users',          userCtrl.adminListUsers);
router.get('/users/:id',      userCtrl.adminGetUser);
router.get('/users/:id/edit', userCtrl.adminEditUserForm);
router.post('/users/:id',     userCtrl.adminUpdateUser);
router.delete('/users/:id',   userCtrl.adminDeleteUser);

// Courses
const { courseValidation } = require('../validators/courseValidator');
router.get('/courses',                    courseCtrl.adminListCourses);
router.get('/courses/new',                courseCtrl.createCourseForm);
router.post('/courses',                   courseValidation, courseCtrl.createCourse);
router.get('/courses/:id/edit',           courseCtrl.editCourseForm);
router.post('/courses/:id',               courseValidation, courseCtrl.updateCourse);
router.delete('/courses/:id',             courseCtrl.deleteCourse);
router.post('/courses/:id/assign',        courseCtrl.assignTeacher);
router.delete('/courses/:id/assign/:tid', courseCtrl.removeTeacher);

// Enrollments
router.get('/enrollments',        enrollCtrl.listEnrollments);
router.post('/enrollments',       enrollCtrl.adminEnroll);
router.delete('/enrollments/:id', enrollCtrl.adminRemove);

// Resources
router.get('/resources',          resourceCtrl.adminListResources);
router.delete('/resources/:id',   resourceCtrl.deleteResource);

// Exams
router.get('/exams',              examCtrl.adminListExams);
router.delete('/exams/:id',       examCtrl.deleteExam);

// Results / Attempts
router.get('/results',            attemptCtrl.adminListAttempts);
router.get('/results/:id',        attemptCtrl.adminViewAttempt);

// Notifications
router.get('/notifications',             notifCtrl.listNotifications);
router.get('/notifications/new',         notifCtrl.createNotificationForm);
router.post('/notifications',            notifCtrl.createNotification);
router.delete('/notifications/:id',      notifCtrl.deleteNotification);

// Feedback
router.get('/feedback',           feedbackCtrl.listAllFeedback);
router.delete('/feedback/:id',    feedbackCtrl.deleteFeedback);

module.exports = router;
