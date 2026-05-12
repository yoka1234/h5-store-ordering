const { getDb } = require('./connection');
const bcrypt = require('bcryptjs');
const config = require('../config');

function initDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT '斤',
      image_url TEXT,
      stock INTEGER DEFAULT 9999,
      is_available INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS time_slot_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_name TEXT NOT NULL,
      cutoff_hour INTEGER NOT NULL,
      cutoff_minute INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_address TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      time_slot_id INTEGER NOT NULL REFERENCES time_slot_config(id),
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
    CREATE INDEX IF NOT EXISTS idx_orders_time_slot ON orders(delivery_date, time_slot_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      subtotal REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      order_count INTEGER DEFAULT 1,
      last_order_at TEXT DEFAULT (datetime('now','localtime')),
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // Migrations — add columns that may not exist in older DBs
  try { db.exec('ALTER TABLE orders ADD COLUMN delivery_photo TEXT'); } catch {}
  try { db.exec('ALTER TABLE orders ADD COLUMN delivery_note TEXT'); } catch {}
  try { db.exec('ALTER TABLE orders ADD COLUMN transaction_id TEXT'); } catch {}
  try { db.exec('ALTER TABLE orders ADD COLUMN paid_at TEXT'); } catch {}
  try { db.exec('ALTER TABLE orders ADD COLUMN payment_method TEXT'); } catch {}
  try { db.exec('ALTER TABLE products ADD COLUMN is_preorder INTEGER DEFAULT 0'); } catch {}
  try { db.exec('ALTER TABLE products ADD COLUMN badge TEXT'); } catch {}
  try { db.exec('ALTER TABLE order_items ADD COLUMN remark TEXT DEFAULT \'\''); } catch {}

  // Seed default time slots if empty
  const slotCount = db.prepare('SELECT COUNT(*) as count FROM time_slot_config').get();
  if (slotCount.count === 0) {
    const insertSlot = db.prepare(
      'INSERT INTO time_slot_config (slot_name, cutoff_hour, cutoff_minute, sort_order) VALUES (?, ?, ?, ?)'
    );
    insertSlot.run('午餐', 11, 0, 1);
    insertSlot.run('晚餐', 17, 0, 2);
  }

  // Seed default admin if empty
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
  if (adminCount.count === 0) {
    const hash = bcrypt.hashSync(config.ADMIN_DEFAULT_PASSWORD, 10);
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(
      config.ADMIN_DEFAULT_USERNAME,
      hash
    );
    console.log(`Default admin created: ${config.ADMIN_DEFAULT_USERNAME}`);
  }

  // Seed sample categories if empty
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (catCount.count === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
    insertCat.run('蔬菜', 1);
    insertCat.run('肉类', 2);
    insertCat.run('海鲜', 3);
    insertCat.run('水果', 4);
    insertCat.run('豆制品', 5);
    insertCat.run('调料干货', 6);

    // Seed sample products
    const insertProd = db.prepare(
      'INSERT INTO products (category_id, name, price, unit, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    // 蔬菜
    insertProd.run(1, '大白菜', 2.5, '斤', 1);
    insertProd.run(1, '西红柿', 5.0, '斤', 2);
    insertProd.run(1, '黄瓜', 4.0, '斤', 3);
    insertProd.run(1, '菠菜', 6.0, '斤', 4);
    // 肉类
    insertProd.run(2, '五花肉', 28.0, '斤', 1);
    insertProd.run(2, '猪排骨', 38.0, '斤', 2);
    insertProd.run(2, '鸡胸肉', 15.0, '斤', 3);
    // 海鲜
    insertProd.run(3, '基围虾', 45.0, '斤', 1);
    insertProd.run(3, '鲈鱼', 25.0, '条', 2);
    // 水果
    insertProd.run(4, '苹果', 8.0, '斤', 1);
    insertProd.run(4, '香蕉', 4.5, '斤', 2);
    // 豆制品
    insertProd.run(5, '嫩豆腐', 3.0, '块', 1);
    // 调料干货
    insertProd.run(6, '干辣椒', 12.0, '斤', 1);
  }

  console.log('Database initialized successfully.');
}

module.exports = { initDatabase };
