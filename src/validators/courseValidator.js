'use strict';
const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('back');
  }
  next();
};

const courseValidation = [
  body('code')
    .trim()
    .notEmpty().withMessage('Course code is required (e.g. CS101).')
    .isLength({ min: 2, max: 20 }).withMessage('Course code must be between 2 and 20 characters.')
    .matches(/^[A-Za-z0-9-_]+$/).withMessage('Course code can only contain letters, numbers, hyphens, and underscores.'),
  body('title')
    .trim()
    .notEmpty().withMessage('Course title is required.')
    .isLength({ min: 3, max: 200 }).withMessage('Course title must be between 3 and 200 characters.'),
  body('credits')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 12 }).withMessage('Credits must be an integer between 1 and 12.'),
  body('category')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Category name cannot exceed 100 characters.'),
  handleValidationErrors
];

module.exports = { courseValidation };
