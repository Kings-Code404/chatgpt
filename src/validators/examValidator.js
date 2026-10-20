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

const examValidation = [
  body('course_id')
    .notEmpty().withMessage('Please select a course for this exam.')
    .isInt().withMessage('Valid course selection is required.'),
  body('title')
    .trim()
    .notEmpty().withMessage('Exam title is required.')
    .isLength({ min: 3, max: 200 }).withMessage('Exam title must be between 3 and 200 characters.'),
  body('duration_minutes')
    .notEmpty().withMessage('Duration is required.')
    .isInt({ min: 1, max: 600 }).withMessage('Duration must be between 1 and 600 minutes.'),
  body('total_marks')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 1000 }).withMessage('Total marks must be between 1 and 1000.'),
  body('pass_marks')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 1000 }).withMessage('Pass marks must be between 1 and 1000.'),
  handleValidationErrors
];

const questionValidation = [
  body('question_text')
    .trim()
    .notEmpty().withMessage('Question text is required.')
    .isLength({ min: 3 }).withMessage('Question text must be at least 3 characters long.'),
  body('question_type')
    .isIn(['mcq', 'true_false', 'short_answer']).withMessage('Invalid question type selected.'),
  body('marks')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 }).withMessage('Marks must be between 1 and 100.'),
  handleValidationErrors
];

module.exports = {
  examValidation,
  questionValidation
};
