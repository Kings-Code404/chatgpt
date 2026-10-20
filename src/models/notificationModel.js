const pool = require('../config/db');

async function create({created_by, title, message, target_role}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query('INSERT INTO notifications (created_by, title, message, target_role) VALUES (?, ?, ?, ?)', [created_by, title, message, target_role]);
    const notificationId = result.insertId;
    
    let usersQuery = 'SELECT id FROM users';
    const params = [];
    if (target_role && target_role !== 'all') {
      usersQuery += ' JOIN roles r ON r.id = users.role_id WHERE r.name=?';
      params.push(target_role);
    }
    const [users] = await connection.query(usersQuery, params);
    
    if (users.length > 0) {
      const values = users.map(u => [notificationId, u.id]);
      await connection.query('INSERT INTO notification_recipients (notification_id, user_id) VALUES ?', [values]);
    }
    
    await connection.commit();
    return notificationId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function getForUser(userId, page, limit) {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query('SELECT COUNT(*) as total FROM notification_recipients WHERE user_id=?', [userId]);
  const [unreadRows] = await pool.query('SELECT COUNT(*) as unreadCount FROM notification_recipients WHERE user_id=? AND is_read=0', [userId]);
  
  const [rows] = await pool.query(`
    SELECT n.*, nr.is_read, nr.read_at, nr.id as recipient_id
    FROM notifications n
    JOIN notification_recipients nr ON nr.notification_id = n.id
    WHERE nr.user_id=?
    ORDER BY n.created_at DESC LIMIT ? OFFSET ?
  `, [userId, parseInt(limit, 10), parseInt(offset, 10)]);
  
  return { rows, total: countRows[0].total, unreadCount: unreadRows[0].unreadCount };
}

async function markRead(notificationId, userId) {
  await pool.query('UPDATE notification_recipients SET is_read=1, read_at=NOW() WHERE notification_id=? AND user_id=?', [notificationId, userId]);
}

async function markAllRead(userId) {
  await pool.query('UPDATE notification_recipients SET is_read=1, read_at=NOW() WHERE user_id=? AND is_read=0', [userId]);
}

async function getAll(page, limit) {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query('SELECT COUNT(*) as total FROM notifications');
  const [rows] = await pool.query(`
    SELECT n.*, u.full_name as creator_name 
    FROM notifications n 
    LEFT JOIN users u ON u.id = n.created_by 
    ORDER BY n.created_at DESC LIMIT ? OFFSET ?
  `, [parseInt(limit, 10), parseInt(offset, 10)]);
  return { notifications: rows, total: countRows[0].total };
}

async function remove(id) {
  await pool.query('DELETE FROM notifications WHERE id=?', [id]);
}

module.exports = {
  create, getForUser, markRead, markAllRead, getAll, remove
};
