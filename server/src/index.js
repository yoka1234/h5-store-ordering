require('dotenv').config();
const { initDatabase } = require('./database/init');
const { createApp } = require('./app');
const config = require('./config');

// Create required directories
const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, '..', 'data');
const uploadsDir = config.UPLOAD_DIR;
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Initialize database
initDatabase();

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`Server running at http://localhost:${config.PORT}`);
});
