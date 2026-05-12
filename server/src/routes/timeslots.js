const express = require('express');
const { getDb } = require('../database/connection');
const { authMiddleware } = require('../middleware/auth');
const { getAvailableSlots } = require('../utils/timeSlot');

const router = express.Router();

// GET /api/timeslots — public list
router.get('/', (_req, res) => {
  const db = getDb();
  const slots = db
    .prepare('SELECT * FROM time_slot_config WHERE is_active = 1 ORDER BY sort_order')
    .all();
  res.json(slots);
});

// GET /api/timeslots/available?date=
router.get('/available', (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: true, message: '请选择配送日期' });
  }
  const slots = getAvailableSlots(date);
  res.json({ date, slots });
});

// Admin routes
// GET /api/admin/timeslots
router.get('/admin/timeslots', authMiddleware, (req, res) => {
  const db = getDb();
  const slots = db.prepare('SELECT * FROM time_slot_config ORDER BY sort_order').all();
  res.json(slots);
});

// PUT /api/admin/timeslots/:id
router.put('/admin/timeslots/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { slot_name, cutoff_hour, cutoff_minute, is_active } = req.body;

  const db = getDb();
  db.prepare(
    `UPDATE time_slot_config SET slot_name = ?, cutoff_hour = ?, cutoff_minute = ?,
     is_active = ? WHERE id = ?`
  ).run(slot_name, cutoff_hour, cutoff_minute, is_active !== undefined ? is_active : 1, id);

  res.json({ message: '更新成功' });
});

module.exports = router;
