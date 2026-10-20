'use strict';
const express = require('express');
const router  = express.Router();
const authCtrl = require('../controllers/authController');
const { redirectIfAuth } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../validators/authValidator');

// Show login page
router.get('/login',    redirectIfAuth, authCtrl.showLogin);
// Process login
router.post('/login',   redirectIfAuth, loginValidation, authCtrl.doLogin);
// Show register page
router.get('/register', redirectIfAuth, authCtrl.showRegister);
// Process registration
router.post('/register',redirectIfAuth, registerValidation, authCtrl.doRegister);
// Forgot password
router.get('/forgot-password',  redirectIfAuth, authCtrl.showForgotPassword);
router.post('/forgot-password', redirectIfAuth, forgotPasswordValidation, authCtrl.doForgotPassword);
// Reset password
router.get('/reset-password/:token',  authCtrl.showResetPassword);
router.post('/reset-password/:token', resetPasswordValidation, authCtrl.doResetPassword);
// Logout
router.post('/logout', authCtrl.doLogout);

module.exports = router;
