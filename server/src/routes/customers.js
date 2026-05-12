const express = require('express');
const { getDb } = require('../database/connection');

const router = express.Router();

// GET /api/customers/lookup?phone= — public: find customer by phone
router.get('/lookup', (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: true, message: '请输入手机号' });
  }

  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);

  if (!customer) {
    return res.json({ found: false });
  }

  res.json({ found: true, customer });
});

module.exports = router;
