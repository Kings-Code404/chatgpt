'use strict';
const userModel = require('../models/userModel');
const pool = require('../config/db');

// View profile for current user
exports.showProfile = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.session.user.id);
    const profile = await userModel.getProfile(user.id, user.role);

    const viewPath = `${user.role}/profile`;
    res.render(viewPath, {
      title: 'My Profile',
      user,
      profile: profile || {}
    });
  } catch (err) {
    next(err);
  }
};

// Update profile for current user
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const role = req.session.user.role;
    const { full_name, phone, department, bio, enrollment_no, semester, employee_id, qualification } = req.body;

    // Update full_name in users table
    if (full_name) {
      await userModel.updateUser(userId, { full_name: full_name.trim(), status: req.session.user.status || 'active' });
      req.session.user.full_name = full_name.trim();
    }

    if (role === 'student') {
      await userModel.upsertStudentProfile(userId, {
        phone: phone ? phone.trim() : null,
        department: department ? department.trim() : null,
        bio: bio ? bio.trim() : null,
        enrollment_no: enrollment_no ? enrollment_no.trim() : null,
        semester: semester ? parseInt(semester, 10) : null
      });
    } else if (role === 'teacher') {
      await userModel.upsertTeacherProfile(userId, {
        phone: phone ? phone.trim() : null,
        department: department ? department.trim() : null,
        bio: bio ? bio.trim() : null,
        employee_id: employee_id ? employee_id.trim() : null,
        qualification: qualification ? qualification.trim() : null
      });
    }

    req.flash('success', 'Profile updated successfully.');
    res.redirect(`/${role}/profile`);
  } catch (err) {
    next(err);
  }
};

// Admin: List all users
exports.adminListUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const { search, roleId, status } = req.query;

    const data = await userModel.getAll({ search, roleId, status }, page, limit);

    const [roles] = await pool.query('SELECT * FROM roles ORDER BY id ASC');

    res.render('admin/users', {
      title: 'User Management',
      users: data.users,
      total: data.total,
      page,
      limit,
      search: search || '',
      roleId: roleId || '',
      status: status || '',
      roles,
      totalPages: Math.ceil(data.total / limit)
    });
  } catch (err) {
    next(err);
  }
};

// Admin: View specific user
exports.adminGetUser = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }
    const profile = await userModel.getProfile(user.id, user.role);

    res.render('admin/user-detail', {
      title: `User: ${user.full_name}`,
      user,
      profile: profile || {}
    });
  } catch (err) {
    next(err);
  }
};

// Admin: Edit user form
exports.adminEditUserForm = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY id ASC');

    res.render('admin/user-edit', {
      title: `Edit User: ${user.full_name}`,
      user,
      roles
    });
  } catch (err) {
    next(err);
  }
};

// Admin: Update user
exports.adminUpdateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { full_name, email, role_id, status } = req.body;
    const cleanName = typeof full_name === 'string' ? full_name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const roleId = Number(role_id);
    if (cleanName.length < 2 || cleanName.length > 120 || !/^\S+@\S+\.\S+$/.test(cleanEmail) ||
        ![1, 2, 3].includes(roleId) || !['active', 'inactive', 'suspended'].includes(status)) {
      req.flash('error', 'Enter a valid name, email, role, and account status.');
      return res.redirect(`/admin/users/${encodeURIComponent(userId)}/edit`);
    }
    if (Number(userId) === req.session.user.id && roleId !== 1) {
      req.flash('error', 'You cannot remove administrator access from your own account.');
      return res.redirect(`/admin/users/${encodeURIComponent(userId)}/edit`);
    }

    await pool.query(
      'UPDATE users SET full_name=?, email=?, role_id=?, status=? WHERE id=?',
      [cleanName, cleanEmail, roleId, status, userId]
    );

    req.flash('success', 'User updated successfully.');
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
};

// Admin: Delete user
exports.adminDeleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (parseInt(userId, 10) === req.session.user.id) {
      req.flash('error', 'You cannot delete your own account.');
      return res.redirect('/admin/users');
    }

    await userModel.deleteUser(userId);
    req.flash('success', 'User deleted successfully.');
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error deleting user:', err);
    req.flash('error', 'Failed to delete user: ' + (err.message || 'Database error occurred.'));
    res.redirect('/admin/users');
  }
};
