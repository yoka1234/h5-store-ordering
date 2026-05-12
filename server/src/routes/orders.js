const express = require('express');
const multer = require('multer');
const path = require('path');
const { getDb } = require('../database/connection');
const { authMiddleware } = require('../middleware/auth');
const { generateOrderNumber } = require('../utils/orderNumber');
const { getAvailableSlots } = require('../utils/timeSlot');
const config = require('../config');

const router = express.Router();

// Multer for delivery photo
const deliveryStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `delivery-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${ext}`);
  },
});
const deliveryUpload = multer({ storage: deliveryStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/orders — create order (public)
router.post('/', (req, res) => {
  const { customer_name, customer_phone, customer_address, delivery_date, time_slot_id, items, remark } = req.body;

  // Validation
  if (!customer_name || !customer_phone || !customer_address) {
    return res.status(400).json({ error: true, message: '请填写完整的顾客信息' });
  }
  if (!delivery_date) {
    return res.status(400).json({ error: true, message: '请选择配送日期' });
  }
  if (!time_slot_id) {
    return res.status(400).json({ error: true, message: '请选择配送时段' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: true, message: '购物车为空' });
  }

  const db = getDb();

  // Validate time slot availability
  const slots = getAvailableSlots(delivery_date);
  const slot = slots.find((s) => s.id === time_slot_id);
  if (!slot) {
    return res.status(400).json({ error: true, message: '配送时段不存在' });
  }
  if (!slot.available) {
    return res.status(400).json({ error: true, message: slot.reason });
  }

  // Validate products and calculate total
  let totalAmount = 0;
  const orderItems = [];

  for (const item of items) {
    if (!item.quantity || item.quantity <= 0) {
      return res.status(400).json({ error: true, message: '商品信息不完整' });
    }

    // Handle custom (代购) items — product_id=0, AI-generated
    if (item.is_custom && item.product_id === 0) {
      if (!item.product_name || !item.price) {
        return res.status(400).json({ error: true, message: '代购商品信息不完整' });
      }
      const subtotal = parseFloat((item.price * item.quantity).toFixed(2));
      totalAmount += subtotal;
      orderItems.push({
        product_id: 0,
        product_name: item.product_name + '（代购）',
        price: item.price,
        quantity: item.quantity,
        unit: item.unit || '份',
        subtotal,
        remark: item.remark || '',
      });
      continue;
    }

    if (!item.product_id) {
      return res.status(400).json({ error: true, message: '商品信息不完整' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_available = 1').get(item.product_id);
    if (!product) {
      return res.status(400).json({ error: true, message: `商品 ${item.product_id} 不存在或已下架` });
    }

    const subtotal = parseFloat((product.price * item.quantity).toFixed(2));
    totalAmount += subtotal;
    orderItems.push({
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      quantity: item.quantity,
      unit: product.unit,
      subtotal,
      remark: item.remark || '',
    });
  }

  totalAmount = parseFloat(totalAmount.toFixed(2));

  // Pre-order check: any pre-order item must not be today
  const productIds = orderItems.filter((i) => i.product_id > 0).map((i) => i.product_id);
  const hasPreorder = productIds.length > 0
    ? db.prepare(
        `SELECT COUNT(*) as cnt FROM products WHERE id IN (${productIds.map(() => '?').join(',')}) AND is_preorder = 1`
      ).get(...productIds)
    : { cnt: 0 };

  if (hasPreorder.cnt > 0) {
    const today = new Date().toISOString().slice(0, 10);
    if (delivery_date === today) {
      return res.status(400).json({ error: true, message: '预订商品需提前一天下单，请选择明天或之后的日期' });
    }
  }

  // Generate order number and insert in transaction
  const insertOrder = db.transaction(() => {
    const orderNumber = generateOrderNumber(db, delivery_date);

    const result = db
      .prepare(
        `INSERT INTO orders (order_number, customer_name, customer_phone, customer_address, delivery_date, time_slot_id, total_amount, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(orderNumber, customer_name, customer_phone, customer_address, delivery_date, time_slot_id, totalAmount, remark || '');

    const orderId = result.lastInsertRowid;

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, unit, subtotal, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of orderItems) {
      insertItem.run(orderId, item.product_id, item.product_name, item.price, item.quantity, item.unit, item.subtotal, item.remark || '');
    }

    // Decrement stock
    const updateStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
    for (const item of orderItems) {
      updateStock.run(item.quantity, item.product_id);
    }

    // Upsert customer — phone is unique key
    db.prepare(
      `INSERT INTO customers (phone, name, address, order_count, last_order_at)
       VALUES (?, ?, ?, 1, datetime('now','localtime'))
       ON CONFLICT(phone) DO UPDATE SET
         name = excluded.name,
         address = excluded.address,
         order_count = order_count + 1,
         last_order_at = datetime('now','localtime')`
    ).run(customer_phone, customer_name, customer_address);

    return { orderId, orderNumber };
  });

  const { orderId, orderNumber } = insertOrder();

  // Fetch inserted order with items
  const order = db.prepare(
    `SELECT o.*, ts.slot_name FROM orders o
     LEFT JOIN time_slot_config ts ON o.time_slot_id = ts.id
     WHERE o.id = ?`
  ).get(orderId);

  const insertedItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

  res.status(201).json({ order, items: insertedItems });
});

// GET /api/orders/customer?phone= — public: list orders by customer phone
router.get('/customer', (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: true, message: '请提供手机号' });
  }

  const db = getDb();
  const orders = db
    .prepare(
      `SELECT o.*, ts.slot_name FROM orders o
       LEFT JOIN time_slot_config ts ON o.time_slot_id = ts.id
       WHERE o.customer_phone = ?
       ORDER BY o.created_at DESC
       LIMIT 20`
    )
    .all(phone);

  // Attach item count to each order
  const ordersWithCount = orders.map((order) => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return { ...order, items, item_count: items.length };
  });

  res.json({ orders: ordersWithCount });
});

// GET /api/orders/lookup/:orderNumber — public lookup
router.get('/lookup/:orderNumber', (req, res) => {
  const db = getDb();
  const order = db
    .prepare(
      `SELECT o.*, ts.slot_name FROM orders o
       LEFT JOIN time_slot_config ts ON o.time_slot_id = ts.id
       WHERE o.order_number = ?`
    )
    .get(req.params.orderNumber);

  if (!order) {
    return res.status(404).json({ error: true, message: '订单不存在' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ order, items });
});

// ========== Admin order routes ==========

// GET /api/admin/orders — list orders
router.get('/admin/orders', authMiddleware, (req, res) => {
  const db = getDb();
  const { date, time_slot_id, status, page = 1, limit = 50 } = req.query;

  let sql = 'SELECT o.*, ts.slot_name FROM orders o LEFT JOIN time_slot_config ts ON o.time_slot_id = ts.id WHERE 1=1';
  const params = [];

  if (date) {
    sql += ' AND o.delivery_date = ?';
    params.push(date);
  }
  if (time_slot_id) {
    sql += ' AND o.time_slot_id = ?';
    params.push(time_slot_id);
  }
  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const orders = db.prepare(sql).all(...params);

  // Count total
  let countSql = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
  const countParams = [];
  if (date) {
    countSql += ' AND delivery_date = ?';
    countParams.push(date);
  }
  if (time_slot_id) {
    countSql += ' AND time_slot_id = ?';
    countParams.push(time_slot_id);
  }
  if (status) {
    countSql += ' AND status = ?';
    countParams.push(status);
  }
  const { total } = db.prepare(countSql).get(...countParams);

  res.json({ orders, total, page: Number(page), limit: Number(limit) });
});

// GET /api/admin/orders/dashboard — dashboard aggregation
router.get('/admin/orders/dashboard', authMiddleware, (_req, res) => {
  const db = getDb();
  const groups = db
    .prepare(
      `SELECT
        o.delivery_date,
        o.time_slot_id,
        ts.slot_name,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_amount,
        SUM(CASE WHEN o.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN o.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed_count
      FROM orders o
      JOIN time_slot_config ts ON o.time_slot_id = ts.id
      WHERE o.delivery_date >= date('now','localtime')
      GROUP BY o.delivery_date, o.time_slot_id
      ORDER BY o.delivery_date, ts.sort_order`
    )
    .all();
  res.json({ groups });
});

// GET /api/admin/orders/:id — single order detail
router.get('/admin/orders/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const order = db
    .prepare(
      `SELECT o.*, ts.slot_name FROM orders o
       LEFT JOIN time_slot_config ts ON o.time_slot_id = ts.id
       WHERE o.id = ?`
    )
    .get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: true, message: '订单不存在' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ order, items });
});

// PUT /api/admin/orders/:id/confirm-payment — manually confirm payment
router.put('/admin/orders/:id/confirm-payment', authMiddleware, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ error: true, message: '订单不存在' });
  }
  if (order.paid_at) {
    return res.status(400).json({ error: true, message: '该订单已付款' });
  }
  db.prepare(
    "UPDATE orders SET paid_at = datetime('now','localtime'), payment_method = 'manual' WHERE id = ?"
  ).run(id);
  res.json({ message: '已确认收款', paid_at: new Date().toISOString(), payment_method: 'manual' });
});

// PUT /api/admin/orders/:id/status — update status
router.put('/admin/orders/:id/status', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ['pending', 'confirmed', 'delivering', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: true, message: '无效的订单状态' });
  }

  const db = getDb();
  db.prepare(
    "UPDATE orders SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?"
  ).run(status, id);

  res.json({ message: '状态更新成功' });
});

// PUT /api/admin/orders/:id/items — update order items (before delivery photo)
router.put('/admin/orders/:id/items', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: true, message: '订单商品不能为空' });
  }

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ error: true, message: '订单不存在' });
  }
  if (order.status === 'completed' || order.status === 'cancelled') {
    return res.status(400).json({ error: true, message: '已完成或已取消的订单不可修改' });
  }

  const updateTxn = db.transaction(() => {
    let totalAmount = 0;

    // Remove existing items
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, unit, subtotal, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of items) {
      const productName = item.product_name || '';
      const price = parseFloat(item.price) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const unit = item.unit || '斤';
      const subtotal = parseFloat((price * quantity).toFixed(2));
      totalAmount += subtotal;

      // Map nonexistent product_id to a valid placeholder
      let pid = item.product_id || 0;
      if (pid) {
        const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(pid);
        if (!exists) pid = 1;
      } else {
        pid = 1;
      }

      insertItem.run(id, pid, productName, price, quantity, unit, subtotal, item.remark || '');
    }

    totalAmount = parseFloat(totalAmount.toFixed(2));
    db.prepare(
      "UPDATE orders SET total_amount = ?, updated_at = datetime('now','localtime') WHERE id = ?"
    ).run(totalAmount, id);
  });

  updateTxn();
  res.json({ message: '订单已更新' });
});

// POST /api/admin/orders/:id/delivery-photo — upload delivery photo
router.post('/admin/orders/:id/delivery-photo', authMiddleware, deliveryUpload.single('photo'), (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) {
    return res.status(404).json({ error: true, message: '订单不存在' });
  }
  if (!req.file) {
    return res.status(400).json({ error: true, message: '请上传照片' });
  }

  const photoUrl = `/uploads/${req.file.filename}`;
  const note = req.body.note || '';
  db.prepare(
    "UPDATE orders SET delivery_photo = ?, delivery_note = ?, status = 'completed', updated_at = datetime('now','localtime') WHERE id = ?"
  ).run(photoUrl, note, id);

  res.json({ message: '送达确认成功', delivery_photo: photoUrl });
});

// ===== Settings (payment QR code etc.) =====

// GET /api/admin/settings
router.get('/admin/settings', authMiddleware, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach((r) => { settings[r.key] = r.value; });
  res.json(settings);
});

// PUT /api/admin/settings
router.put('/admin/settings', authMiddleware, (req, res) => {
  const db = getDb();
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const txn = db.transaction(() => {
    for (const [key, value] of Object.entries(req.body)) {
      upsert.run(key, String(value));
    }
  });
  txn();
  res.json({ message: '保存成功' });
});

// POST /api/admin/settings/upload-qrcode — upload payment QR code image
router.post('/admin/settings/upload-qrcode', authMiddleware, deliveryUpload.single('qrcode'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: true, message: '请上传收款码图片' });
  }
  const url = `/uploads/${req.file.filename}`;
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('payment_qrcode', url);
  res.json({ url });
});

// GET /api/settings/payment — public: get payment QR code info
router.get('/settings/payment', (req, res) => {
  const db = getDb();
  const qrcode = db.prepare('SELECT value FROM settings WHERE key = ?').get('payment_qrcode');
  const method = db.prepare('SELECT value FROM settings WHERE key = ?').get('payment_method');
  res.json({
    payment_qrcode: qrcode?.value || '',
    payment_method: method?.value || '支付宝/微信',
  });
});

module.exports = router;
