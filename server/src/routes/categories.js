const express = require('express');
const { getDb } = require('../database/connection');
const { authMiddleware } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/categories — public
router.get('/', (_req, res) => {
  const db = getDb();
  const categories = db
    .prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order')
    .all();
  res.json(categories);
});

// POST /api/admin/categories — create
router.post('/admin/categories', authMiddleware, (req, res) => {
  const { name, sort_order } = req.body;
  if (!name) {
    return res.status(400).json({ error: true, message: '分类名称不能为空' });
  }
  const db = getDb();
  const result = db
    .prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)')
    .run(name, sort_order || 0);
  res.status(201).json({ id: result.lastInsertRowid, name, sort_order: sort_order || 0 });
});

// PUT /api/admin/categories/:id — update
router.put('/admin/categories/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, sort_order, is_active } = req.body;
  if (!name) {
    return res.status(400).json({ error: true, message: '分类名称不能为空' });
  }
  const db = getDb();
  db.prepare(
    'UPDATE categories SET name = ?, sort_order = ?, is_active = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?'
  ).run(name, sort_order || 0, is_active !== undefined ? is_active : 1, id);
  res.json({ message: '更新成功' });
});

// DELETE /api/admin/categories/:id — delete
router.delete('/admin/categories/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const products = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id);
  if (products.count > 0) {
    return res.status(400).json({ error: true, message: '该分类下还有商品，无法删除' });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ message: '删除成功' });
});

module.exports = router;
