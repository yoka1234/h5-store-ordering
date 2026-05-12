const express = require('express');
const multer = require('multer');
const path = require('path');
const { getDb } = require('../database/connection');
const { authMiddleware } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 jpg、png、gif、webp 格式的图片'));
    }
  },
});

// GET /api/products — public list
router.get('/', (req, res) => {
  const db = getDb();
  const { category_id, keyword } = req.query;

  let sql = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_available = 1';
  const params = [];

  if (category_id) {
    sql += ' AND p.category_id = ?';
    params.push(category_id);
  }
  if (keyword) {
    sql += ' AND p.name LIKE ?';
    params.push(`%${keyword}%`);
  }

  sql += ' ORDER BY CASE WHEN p.badge IS NOT NULL AND p.badge != \'\' THEN 0 ELSE 1 END, p.sort_order, p.id';
  const products = db.prepare(sql).all(...params);
  res.json(products);
});

// GET /api/products/:id — public detail
router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db
    .prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?')
    .get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: true, message: '商品不存在' });
  }
  res.json(product);
});

// POST /api/admin/products — create (with image upload)
router.post('/admin/products', authMiddleware, upload.single('image'), (req, res) => {
  const { category_id, name, description, price, unit, stock, sort_order, badge } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: true, message: '商品名称和价格不能为空' });
  }

  const db = getDb();
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db
    .prepare(
      `INSERT INTO products (category_id, name, description, price, unit, image_url, stock, sort_order, badge)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(category_id || 1, name, description || '', parseFloat(price), unit || '斤', image_url, stock || 9999, sort_order || 0, badge || null);

  res.status(201).json({ id: result.lastInsertRowid, name, price: parseFloat(price) });
});

// PUT /api/admin/products/:id — update (with optional image)
router.put('/admin/products/:id', authMiddleware, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { category_id, name, description, price, unit, stock, is_available, sort_order, badge } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: true, message: '商品名称和价格不能为空' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: true, message: '商品不存在' });
  }

  // Keep existing image if no new one uploaded
  const image_url = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url || existing.image_url);

  const badgeVal = badge !== undefined ? (badge || null) : existing.badge;

  db.prepare(
    `UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, unit = ?,
     image_url = ?, stock = ?, is_available = ?, sort_order = ?, badge = ?,
     updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(
    category_id || existing.category_id,
    name,
    description || '',
    parseFloat(price),
    unit || existing.unit,
    image_url,
    stock !== undefined ? stock : existing.stock,
    is_available !== undefined ? is_available : existing.is_available,
    sort_order || existing.sort_order,
    badgeVal,
    id
  );

  res.json({ message: '更新成功' });
});

// DELETE /api/admin/products/:id — soft delete
router.delete('/admin/products/:id', authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE products SET is_available = 0, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(req.params.id);
  res.json({ message: '已下架' });
});

// PUT /api/admin/products/:id/toggle — toggle availability
router.put('/admin/products/:id/toggle', authMiddleware, (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: true, message: '商品不存在' });
  }
  const newStatus = product.is_available ? 0 : 1;
  db.prepare('UPDATE products SET is_available = ? WHERE id = ?').run(newStatus, req.params.id);
  res.json({ is_available: newStatus, message: newStatus ? '已上架' : '已下架' });
});

module.exports = router;
