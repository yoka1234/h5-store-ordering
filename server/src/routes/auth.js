const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/connection');
const { authMiddleware } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: true, message: '请输入用户名和密码' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: true, message: '用户名或密码错误' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: true, message: '用户名或密码错误' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );

  res.json({ token, username: user.username });
});

// POST /api/admin/logout
router.post('/logout', (_req, res) => {
  res.json({ message: '已退出登录' });
});

// GET /api/admin/check
router.get('/check', authMiddleware, (req, res) => {
  res.json({ username: req.user.username });
});

// POST /api/admin/change-password
router.post('/change-password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: true, message: '请输入原密码和新密码' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: true, message: '新密码长度至少6位' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.user.userId);
  if (!user) {
    return res.status(401).json({ error: true, message: '用户不存在' });
  }

  const valid = bcrypt.compareSync(oldPassword, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: true, message: '原密码错误' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(newHash, req.user.userId);

  res.json({ message: '密码修改成功' });
});

module.exports = router;
