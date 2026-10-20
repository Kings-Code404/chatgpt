'use strict';
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const userModel = require('../models/userModel');
const pool = require('../config/db');

exports.showLogin = (req, res) => {
  res.render('auth/login', { title: 'Sign In – Smart Learning' });
};

exports.doLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      req.flash('error', 'Please provide both email and password.');
      return res.redirect('/auth/login');
    }

    const user = await userModel.findByEmail(email.trim().toLowerCase());
    if (!user) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/auth/login');
    }

    if (user.status !== 'active') {
      req.flash('error', `Your account is currently ${user.status}. Please contact an administrator.`);
      return res.redirect('/auth/login');
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/auth/login');
    }

    req.session.regenerate((sessionError) => {
      if (sessionError) return next(sessionError);
      req.session.user = {
        id: user.id,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
        status: user.status
      };
      req.flash('success', `Welcome back, ${user.full_name}!`);
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        res.redirect(`/${user.role}/dashboard`);
      });
    });
  } catch (err) {
    next(err);
  }
};

exports.showRegister = (req, res) => {
  res.render('auth/register', { title: 'Create Account – Smart Learning' });
};

exports.doRegister = async (req, res, next) => {
  try {
    const { full_name, email, password, confirm_password, role } = req.body;

    if (!full_name || !email || !password || !role) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/auth/register');
    }

    if (password !== confirm_password) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/auth/register');
    }

    if (password.length < 8 || !/\d/.test(password)) {
      req.flash('error', 'Password must be at least 8 characters long and contain at least one number.');
      return res.redirect('/auth/register');
    }

    if (!['student', 'teacher'].includes(role)) {
      req.flash('error', 'Please choose a valid role (Student or Teacher).');
      return res.redirect('/auth/register');
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await userModel.findByEmail(cleanEmail);
    if (existing) {
      req.flash('error', 'An account with this email address already exists.');
      return res.redirect('/auth/register');
    }

    // Role mapping: 1 = admin, 2 = teacher, 3 = student
    const role_id = (role === 'student') ? 3 : 2;
    const password_hash = await bcrypt.hash(password, 12);

    const userId = await userModel.createUser({
      role_id,
      full_name: full_name.trim(),
      email: cleanEmail,
      password_hash
    });

    // Create initial profile record
    if (role === 'student') {
      await userModel.upsertStudentProfile(userId, {});
    } else {
      await userModel.upsertTeacherProfile(userId, {});
    }

    req.flash('success', 'Registration successful! You may now sign in.');
    res.redirect('/auth/login');
  } catch (err) {
    next(err);
  }
};

exports.showForgotPassword = (req, res) => {
  res.render('auth/forgot-password', { title: 'Forgot Password – Smart Learning' });
};

exports.doForgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      req.flash('error', 'Please enter your email address.');
      return res.redirect('/auth/forgot-password');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await userModel.findByEmail(cleanEmail);

    if (user && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 3600000); // 1 hour
      const resetUrl = `${(process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')}/auth/reset-password/${token}`;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await userModel.setResetToken(user.id, tokenHash, expiry);
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: cleanEmail,
          subject: 'Smart Learning password reset',
          text: `Use this link to reset your password. It expires in one hour: ${resetUrl}`
        });
      } catch (mailError) {
        await userModel.clearResetToken(user.id);
        throw mailError;
      }
    }

    req.flash('success', 'If an account exists with that email and password recovery is configured, a reset link will be sent shortly.');
    res.redirect('/auth/forgot-password');
  } catch (err) {
    next(err);
  }
};

exports.showResetPassword = async (req, res, next) => {
  try {
    const token = req.params.token || req.query.token;
    if (!token) {
      req.flash('error', 'Reset token is required.');
      return res.redirect('/auth/login');
    }

    const user = await userModel.findByResetToken(token);
    if (!user) {
      req.flash('error', 'Password reset link is invalid or has expired.');
      return res.redirect('/auth/login');
    }

    res.render('auth/reset-password', {
      title: 'Reset Password – Smart Learning',
      token
    });
  } catch (err) {
    next(err);
  }
};

exports.doResetPassword = async (req, res, next) => {
  try {
    const token = req.params.token || req.body.token;
    const { password, confirm_password } = req.body;

    if (!token) {
      req.flash('error', 'Invalid token.');
      return res.redirect('/auth/login');
    }

    if (!password || password.length < 8 || !/\d/.test(password)) {
      req.flash('error', 'Password must be at least 8 characters long and contain a number.');
      return res.redirect(`/auth/reset-password/${token}`);
    }

    if (password !== confirm_password) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect(`/auth/reset-password/${token}`);
    }

    const user = await userModel.findByResetToken(token);
    if (!user) {
      req.flash('error', 'Password reset link is invalid or has expired.');
      return res.redirect('/auth/login');
    }

    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash=? WHERE id=?', [hash, user.id]);
    await userModel.clearResetToken(user.id);

    req.flash('success', 'Your password has been reset successfully. Please sign in with your new password.');
    res.redirect('/auth/login');
  } catch (err) {
    next(err);
  }
};

exports.doLogout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
};
