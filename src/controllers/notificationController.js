'use strict';
const notificationModel = require('../models/notificationModel');

exports.listNotifications = async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 15;

    // JSON API response for real-time badge updates
    if (req.query.format === 'count') {
      const data = await notificationModel.getForUser(userId, 1, 1);
      return res.json({ unread: data.unreadCount });
    }

    const { rows, total, unreadCount } = await notificationModel.getForUser(userId, page, limit);

    const userRole = req.session.user.role;
    const viewPath = `${userRole}/notifications`;

    res.render(viewPath, {
      title: 'Notifications Center',
      notifications: rows,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.session.user.id;

    await notificationModel.markRead(notificationId, userId);

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true });
    }
    res.redirect('back');
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    await notificationModel.markAllRead(userId);

    req.flash('success', 'All notifications marked as read.');
    res.redirect('back');
  } catch (err) {
    next(err);
  }
};

exports.createNotificationForm = (req, res) => {
  res.render('admin/notification-create', {
    title: 'Create Announcement / Notification'
  });
};

exports.createNotification = async (req, res, next) => {
  try {
    const { title, message, target_role } = req.body;

    if (!title || !message) {
      req.flash('error', 'Title and message are required.');
      return res.redirect('/admin/notifications/new');
    }

    await notificationModel.create({
      created_by: req.session.user.id,
      title: title.trim(),
      message: message.trim(),
      target_role: target_role || 'all'
    });

    req.flash('success', 'Notification broadcasted successfully.');
    res.redirect('/admin/notifications');
  } catch (err) {
    next(err);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    await notificationModel.remove(req.params.id);
    req.flash('success', 'Notification deleted.');
    res.redirect('back');
  } catch (err) {
    next(err);
  }
};
