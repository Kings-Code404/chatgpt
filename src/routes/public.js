'use strict';
const express = require('express');
const router  = express.Router();

// Home page
router.get('/', (req, res) => {
  res.render('public/home', { title: 'Smart Learning – Modern Education Platform' });
});

// About page
router.get('/about', (req, res) => {
  res.render('public/about', { title: 'About – Smart Learning' });
});

// Courses browse (public)
const courseCtrl = require('../controllers/courseController');
router.get('/courses', courseCtrl.listCourses);
router.get('/courses/:id', courseCtrl.getCourse);

module.exports = router;
