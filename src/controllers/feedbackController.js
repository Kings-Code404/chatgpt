'use strict';
const feedbackModel = require('../models/feedbackModel');
const courseModel = require('../models/courseModel');
const enrollmentModel = require('../models/enrollmentModel');
const pool = require('../config/db');

// Student: Form to submit feedback for a course
exports.submitFeedbackForm = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const courseId = req.params.courseId;

    const course = await courseModel.findById(courseId);
    if (!course) {
      req.flash('error', 'Course not found.');
      return res.redirect('/student/courses');
    }

    const isEnrolled = await enrollmentModel.isEnrolled(studentId, courseId);
    if (!isEnrolled) {
      req.flash('error', 'You must be enrolled in this course to leave feedback.');
      return res.redirect(`/student/courses/${courseId}`);
    }

    const hasSubmitted = await feedbackModel.hasSubmitted(studentId, courseId);
    if (hasSubmitted) {
      req.flash('info', 'You have already submitted feedback for this course.');
      return res.redirect('/student/feedback');
    }

    res.render('student/feedback-form', {
      title: `Course Feedback: ${course.title}`,
      course
    });
  } catch (err) {
    next(err);
  }
};

// Student: Submit feedback POST
exports.submitFeedback = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const courseId = req.params.courseId;
    const { rating, comment } = req.body;

    const ratingNum = parseInt(rating, 10);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      req.flash('error', 'Please provide a valid rating between 1 and 5 stars.');
      return res.redirect('back');
    }

    if (!(await enrollmentModel.isEnrolled(studentId, courseId))) {
      req.flash('error', 'You must be actively enrolled in this course to leave feedback.');
      return res.redirect('/student/courses');
    }

    const hasSubmitted = await feedbackModel.hasSubmitted(studentId, courseId);
    if (hasSubmitted) {
      req.flash('error', 'Feedback already submitted for this course.');
      return res.redirect('/student/feedback');
    }

    await feedbackModel.create(studentId, courseId, ratingNum, comment ? comment.trim() : '');
    req.flash('success', 'Thank you! Your feedback has been recorded.');
    res.redirect('/student/feedback');
  } catch (err) {
    next(err);
  }
};

// Student: List their own submitted feedback
exports.listStudentFeedback = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const feedbackList = await feedbackModel.getByStudent(studentId);
    const enrollments = await enrollmentModel.getEnrollmentsForStudent(studentId);

    res.render('student/feedback', {
      title: 'Course Feedback & Reviews',
      feedbackList,
      enrollments
    });
  } catch (err) {
    next(err);
  }
};

// Teacher: View feedback on courses they teach
exports.listCourseFeedback = async (req, res, next) => {
  try {
    const teacherId = req.session.user.id;
    const courses = await courseModel.getCoursesForTeacher(teacherId);

    const [feedbackRows] = await pool.query(`
      SELECT f.*, u.full_name as student_name, c.title as course_title, c.code as course_code
      FROM feedback f
      JOIN users u ON u.id = f.student_id
      JOIN courses c ON c.id = f.course_id
      JOIN teacher_course_assignments tca ON tca.course_id = c.id
      WHERE tca.teacher_id = ?
      ORDER BY f.created_at DESC
    `, [teacherId]);

    res.render('teacher/feedback', {
      title: 'Student Feedback',
      feedbackList: feedbackRows,
      courses
    });
  } catch (err) {
    next(err);
  }
};

// Admin: View all feedback across the platform
exports.listAllFeedback = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const { feedback, total } = await feedbackModel.getAll(page, limit);

    res.render('admin/feedback', {
      title: 'Feedback Moderation & Oversight',
      feedbackList: feedback,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
};

// Admin: Delete feedback
exports.deleteFeedback = async (req, res, next) => {
  try {
    await feedbackModel.remove(req.params.id);
    req.flash('success', 'Feedback entry removed.');
    res.redirect('back');
  } catch (err) {
    next(err);
  }
};
