'use strict';
const { body, validationResult } = require('express-validator');

const feedbackValidation = [
  body('rating')
    .notEmpty().withMessage('Please select a star rating between 1 and 5.')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
  body('comment')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage('Feedback comment cannot exceed 1000 characters.'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array()[0].msg);
      return res.redirect('back');
    }
    next();
  }
];

module.exports = { feedbackValidation };
