'use strict';
const enrollmentModel = require('../models/enrollmentModel');
const courseModel = require('../models/courseModel');

exports.enroll = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const courseId = req.params.id || req.body.courseId;

    if (!courseId) {
      req.flash('error', 'Invalid course specified.');
      return res.redirect('back');
    }

    const alreadyEnrolled = await enrollmentModel.isEnrolled(studentId, courseId);
    if (alreadyEnrolled) {
      req.flash('info', 'You are already enrolled in this course.');
      return res.redirect(`/student/courses/${courseId}`);
    }

    await enrollmentModel.enroll(studentId, courseId);
    req.flash('success', 'Successfully enrolled in course!');
    res.redirect(`/student/courses/${courseId}`);
  } catch (err) {
    next(err);
  }
};

exports.drop = async (req, res, next) => {
  try {
    const studentId = req.session.user.id;
    const courseId = req.params.id || req.body.courseId;

    await enrollmentModel.drop(studentId, courseId);
    req.flash('success', 'Course dropped successfully.');
    res.redirect('/student/courses');
  } catch (err) {
    next(err);
  }
};

exports.listEnrollments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const data = await enrollmentModel.getAll(page, limit);
    const { courses } = await courseModel.getAll({}, 1, 100);
    res.render('admin/enrollments', {
      title: 'Enrollments Management',
      enrollments: data.enrollments,
      total: data.total,
      page,
      limit,
      courses
    });
  } catch (err) {
    next(err);
  }
};

exports.adminEnroll = async (req, res, next) => {
  try {
    const { student_id, course_id } = req.body;
    if (!student_id || !course_id) {
      req.flash('error', 'Student and Course are required.');
      return res.redirect('/admin/enrollments');
    }

    const alreadyEnrolled = await enrollmentModel.isEnrolled(student_id, course_id);
    if (alreadyEnrolled) {
      req.flash('error', 'Student is already enrolled in this course.');
      return res.redirect('/admin/enrollments');
    }

    await enrollmentModel.enroll(student_id, course_id);
    req.flash('success', 'Student enrolled successfully.');
    res.redirect('/admin/enrollments');
  } catch (err) {
    next(err);
  }
};

exports.adminRemove = async (req, res, next) => {
  try {
    const enrollmentId = req.params.id;
    const pool = require('../config/db');
    await pool.query('DELETE FROM enrollments WHERE id=?', [enrollmentId]);
    req.flash('success', 'Enrollment removed.');
    res.redirect('/admin/enrollments');
  } catch (err) {
    next(err);
  }
};
