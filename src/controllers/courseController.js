'use strict';
const courseModel = require('../models/courseModel');
const enrollmentModel = require('../models/enrollmentModel');
const resourceModel = require('../models/resourceModel');
const examModel = require('../models/examModel');
const pool = require('../config/db');

// List courses (public browse or student view)
exports.listCourses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 12;
    const { search, category, status } = req.query;
    
    // For students or public, only show active courses by default
    const filterStatus = req.session?.user?.role === 'admin' ? status : 'active';
    const { courses, total } = await courseModel.getAll({ search, category, status: filterStatus }, page, limit);

    // Fetch dynamic categories for filter dropdown
    const [catRows] = await pool.query('SELECT DISTINCT category FROM courses WHERE category IS NOT NULL AND category != "" ORDER BY category ASC');
    const categories = catRows.map(r => r.category);

    // If student is logged in, tag courses with enrollment status
    let enrolledCourseIds = new Set();
    if (req.session && req.session.user && req.session.user.role === 'student') {
      const enrollments = await enrollmentModel.getEnrollmentsForStudent(req.session.user.id);
      enrolledCourseIds = new Set(enrollments.map(e => e.course_id));
      courses.forEach(c => {
        c.isEnrolled = enrolledCourseIds.has(c.id);
      });
      return res.render('student/courses', {
        title: 'Courses Catalog',
        courses,
        categories,
        total,
        page,
        limit,
        search: search || '',
        category: category || '',
        totalPages: Math.ceil(total / limit)
      });
    }

    // Public course browse
    res.render('public/courses', {
      title: 'Explore Courses – Smart Learning',
      courses,
      categories,
      total,
      page,
      limit,
      search: search || '',
      category: category || '',
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
};

// Course details
exports.getCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await courseModel.findById(courseId);
    if (!course) {
      req.flash('error', 'Course not found.');
      return res.redirect('back');
    }

    if (req.session?.user?.role === 'teacher' &&
        !(await courseModel.isAssignedToTeacher(courseId, req.session.user.id))) {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }

    const assignedTeachers = await courseModel.getAssignedTeachers(courseId);
    const resources = await resourceModel.findByCourse(courseId);
    const exams = await examModel.findByCourse(courseId);

    let isEnrolled = false;
    if (req.session && req.session.user && req.session.user.role === 'student') {
      isEnrolled = await enrollmentModel.isEnrolled(req.session.user.id, courseId);
      return res.render('student/course-detail', {
        title: `${course.code} - ${course.title}`,
        course,
        teachers: assignedTeachers,
        resources,
        exams,
        isEnrolled
      });
    }

    if (req.session && req.session.user && req.session.user.role === 'teacher') {
      return res.render('teacher/course-detail', {
        title: `${course.code} - ${course.title}`,
        course,
        teachers: assignedTeachers,
        resources,
        exams
      });
    }

    // Public view
    res.render('public/course-detail', {
      title: `${course.code} - ${course.title}`,
      course,
      teachers: assignedTeachers
    });
  } catch (err) {
    next(err);
  }
};

// Teacher's assigned courses
exports.listTeacherCourses = async (req, res, next) => {
  try {
    const teacherId = req.session.user.id;
    const courses = await courseModel.getCoursesForTeacher(teacherId);

    // Get count of students and resources for each course
    for (const c of courses) {
      const [stuCount] = await pool.query('SELECT COUNT(*) as cnt FROM enrollments WHERE course_id=?', [c.id]);
      const [resCount] = await pool.query('SELECT COUNT(*) as cnt FROM study_resources WHERE course_id=?', [c.id]);
      const [examCount] = await pool.query('SELECT COUNT(*) as cnt FROM exams WHERE course_id=?', [c.id]);
      c.studentCount = stuCount[0].cnt;
      c.resourceCount = resCount[0].cnt;
      c.examCount = examCount[0].cnt;
    }

    res.render('teacher/courses', {
      title: 'My Assigned Courses',
      courses
    });
  } catch (err) {
    next(err);
  }
};

// Admin course management list
exports.adminListCourses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 15;
    const { search, category, status } = req.query;
    const { courses, total } = await courseModel.getAll({ search, category, status }, page, limit);

    // Get all teachers for assignment dropdown
    const [teachers] = await pool.query(`
      SELECT u.id, u.full_name, u.email 
      FROM users u 
      JOIN roles r ON r.id = u.role_id 
      WHERE r.name='teacher' AND u.status='active'
      ORDER BY u.full_name ASC
    `);

    res.render('admin/courses', {
      title: 'Manage Courses',
      courses,
      total,
      page,
      limit,
      search: search || '',
      category: category || '',
      status: status || '',
      totalPages: Math.ceil(total / limit),
      teachers
    });
  } catch (err) {
    next(err);
  }
};

exports.createCourseForm = (req, res) => {
  res.render('admin/course-create', { title: 'Create New Course' });
};

exports.createCourse = async (req, res, next) => {
  try {
    const { code, title, description, category, credits, status } = req.body;
    if (!code || !title) {
      req.flash('error', 'Course code and title are required.');
      return res.redirect('/admin/courses/new');
    }

    await courseModel.create({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category || 'General',
      credits: parseInt(credits, 10) || 3,
      status: status || 'active',
      created_by: req.session.user.id
    });

    req.flash('success', `Course ${code} created successfully.`);
    res.redirect('/admin/courses');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      req.flash('error', 'A course with this code already exists.');
      return res.redirect('/admin/courses/new');
    }
    next(err);
  }
};

exports.editCourseForm = async (req, res, next) => {
  try {
    const course = await courseModel.findById(req.params.id);
    if (!course) {
      req.flash('error', 'Course not found.');
      return res.redirect('/admin/courses');
    }
    res.render('admin/course-edit', { title: `Edit Course: ${course.code}`, course });
  } catch (err) {
    next(err);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const { code, title, description, category, credits, status } = req.body;
    await courseModel.update(req.params.id, {
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category || 'General',
      credits: parseInt(credits, 10) || 3,
      status: status || 'active'
    });
    req.flash('success', 'Course updated successfully.');
    res.redirect('/admin/courses');
  } catch (err) {
    next(err);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    await courseModel.remove(req.params.id);
    req.flash('success', 'Course deleted successfully.');
    res.redirect('/admin/courses');
  } catch (err) {
    console.error('Error deleting course:', err);
    req.flash('error', 'Failed to delete course: ' + (err.message || 'Database error occurred.'));
    res.redirect('/admin/courses');
  }
};

exports.assignTeacher = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { teacher_id } = req.body;
    if (!teacher_id) {
      req.flash('error', 'Please select a teacher.');
      return res.redirect('back');
    }
    await courseModel.assignTeacher(courseId, teacher_id);
    req.flash('success', 'Teacher assigned successfully.');
    res.redirect('back');
  } catch (err) {
    next(err);
  }
};

exports.removeTeacher = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const teacherId = req.params.tid;
    await courseModel.removeTeacherAssignment(courseId, teacherId);
    req.flash('success', 'Teacher assignment removed.');
    res.redirect('back');
  } catch (err) {
    next(err);
  }
};
