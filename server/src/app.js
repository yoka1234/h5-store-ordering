const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./middleware/errorHandler');
const config = require('./config');

// Route imports
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const timeslotRoutes = require('./routes/timeslots');
const orderRoutes = require('./routes/orders');
const customerRoutes = require('./routes/customers');
const paymentRoutes = require('./routes/payment');
const aiRoutes = require('./routes/ai');

function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Static files for uploads
  app.use('/uploads', express.static(config.UPLOAD_DIR));

  // Public routes
  app.use('/api/categories', categoryRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/timeslots', timeslotRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/pay', paymentRoutes);
  app.use('/api/ai', aiRoutes);

  // Admin auth routes
  app.use('/api/admin', authRoutes);

  // Admin CRUD routes (prefix unified in each router file)
  app.use('/api', categoryRoutes);
  app.use('/api', productRoutes);
  app.use('/api', timeslotRoutes);
  app.use('/api', orderRoutes);

  // Serve static client in production
  if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
        res.sendFile(path.join(clientDist, 'index.html'));
      }
    });
  }

  // Error handler
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
