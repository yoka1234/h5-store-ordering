const jwt = require('jsonwebtoken');
const config = require('../config');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: true, message: '未登录，请先登录' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = { userId: decoded.userId, username: decoded.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: true, message: '登录已过期，请重新登录' });
  }
}

module.exports = { authMiddleware };
