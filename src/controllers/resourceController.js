'use strict';
const fs = require('fs');
const resourceModel = require('../models/resourceModel');
const courseModel = require('../models/courseModel');
const enrollmentModel = require('../models/enrollmentModel');
const { resolveStoredFile } = require('../utils/storage');

// List resources for a specific course
exports.listResources = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const course = await courseModel.findById(courseId);
    if (!course) {
      req.flash('error', 'Course not found.');
      return res.redirect('back');
    }

    const resources = await resourceModel.findByCourse(courseId);
    const userRole = req.session.user.role;

    if (userRole === 'student') {
      const isEnrolled = await enrollmentModel.isEnrolled(req.session.user.id, courseId);
      if (!isEnrolled) {
        req.flash('error', 'You must be enrolled in this course to access materials.');
        return res.redirect(`/student/courses/${courseId}`);
      }
      return res.render('student/materials', {
        title: `Materials – ${course.title}`,
        course,
        resources
      });
    }

    if (userRole === 'teacher') {
      if (!(await courseModel.isAssignedToTeacher(courseId, req.session.user.id))) {
        return res.status(403).render('errors/403', { title: 'Access Denied' });
      }
      return res.render('teacher/resources', {
        title: `Manage Resources – ${course.title}`,
        course,
        resources
      });
    }

    res.render('student/materials', {
      title: `Materials – ${course.title}`,
      course,
      resources
    });
  } catch (err) {
    next(err);
  }
};

exports.uploadForm = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const course = await courseModel.findById(courseId);
    if (!course) {
      req.flash('error', 'Course not found.');
      return res.redirect('back');
    }
    if (!(await courseModel.isAssignedToTeacher(courseId, req.session.user.id))) {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }
    res.render('teacher/resource-upload', {
      title: `Upload Resource – ${course.title}`,
      course
    });
  } catch (err) {
    next(err);
  }
};

exports.uploadResource = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const { title, description } = req.body;

    if (!(await courseModel.isAssignedToTeacher(courseId, req.session.user.id))) {
      if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }

    if (!req.file) {
      req.flash('error', 'Please select a file to upload.');
      return res.redirect(`/teacher/courses/${courseId}/resources`);
    }

    if (!title) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      req.flash('error', 'Resource title is required.');
      return res.redirect(`/teacher/courses/${courseId}/resources`);
    }

    await resourceModel.create({
      course_id: courseId,
      uploaded_by: req.session.user.id,
      title: title.trim(),
      description: description ? description.trim() : '',
      file_path: req.file.path,
      original_name: req.file.originalname,
      file_type: req.file.mimetype,
      file_size: req.file.size
    });

    req.flash('success', 'Study material uploaded successfully.');
    res.redirect(`/teacher/courses/${courseId}/resources`);
  } catch (err) {
    next(err);
  }
};

exports.downloadResource = async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    const resource = await resourceModel.findById(resourceId);

    if (!resource) {
      req.flash('error', 'Resource not found.');
      return res.redirect('back');
    }

    const user = req.session.user;

    // Student must be enrolled in the course
    if (user.role === 'student') {
      const isEnrolled = await enrollmentModel.isEnrolled(user.id, resource.course_id);
      if (!isEnrolled) {
        req.flash('error', 'Access denied. You are not enrolled in this course.');
        return res.redirect('/student/courses');
      }
    }

    if (user.role === 'teacher' && !(await courseModel.isAssignedToTeacher(resource.course_id, user.id))) {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }

    // Resolve file path safely
    const absoluteFilePath = resolveStoredFile(resource.file_path);
    if (!absoluteFilePath || !fs.existsSync(absoluteFilePath)) {
      req.flash('error', 'File not found on server storage.');
      return res.redirect('back');
    }

    res.download(absoluteFilePath, resource.original_name);
  } catch (err) {
    next(err);
  }
};

exports.deleteResource = async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    const resource = await resourceModel.findById(resourceId);

    if (!resource) {
      req.flash('error', 'Resource not found.');
      return res.redirect('back');
    }

    const user = req.session.user;
    if (user.role === 'teacher' && !(await courseModel.isAssignedToTeacher(resource.course_id, user.id))) {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }
    if (user.role !== 'admin' && user.role !== 'teacher') {
      return res.status(403).render('errors/403', { title: 'Access Denied' });
    }

    // Remove file from disk if it exists
    const storedPath = resource.file_path && resolveStoredFile(resource.file_path);
    if (storedPath && fs.existsSync(storedPath)) {
      try {
        await fs.promises.unlink(storedPath);
      } catch (fileErr) {
        console.warn(`[WARN] Could not delete physical file ${resource.file_path}:`, fileErr.message);
      }
    }

    await resourceModel.remove(resourceId);
    req.flash('success', 'Resource deleted successfully.');
    res.redirect('back');
  } catch (err) {
    next(err);
  }
};

exports.adminListResources = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const { resources, total } = await resourceModel.getAll(page, limit);

    res.render('admin/resources', {
      title: 'Study Resources Management',
      resources,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
};
