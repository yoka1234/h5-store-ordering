const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3001,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  DB_PATH: path.join(__dirname, '..', 'data', 'online_order.db'),
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
  JWT_EXPIRES_IN: '24h',
  UPLOAD_DIR: path.join(__dirname, '..', '..', 'uploads'),
  MAX_PREORDER_DAYS: 7,
  ADMIN_DEFAULT_USERNAME: 'admin',
  ADMIN_DEFAULT_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',

  // WeChat Pay (微信支付) config — 填入真实商户信息后启用
  WECHAT_PAY: {
    enabled: process.env.WXPAY_ENABLED === 'true',
    mchId: process.env.WXPAY_MCH_ID || '',           // 商户号
    appId: process.env.WXPAY_APP_ID || '',            // 公众号AppID
    appSecret: process.env.WXPAY_APP_SECRET || '',    // 公众号AppSecret
    apiV3Key: process.env.WXPAY_API_V3_KEY || '',     // API v3密钥
    serialNo: process.env.WXPAY_SERIAL_NO || '',      // 证书序列号
    privateKeyPath: process.env.WXPAY_KEY_PATH || path.join(__dirname, '..', 'cert', 'apiclient_key.pem'),
    notifyUrl: process.env.WXPAY_NOTIFY_URL || '',    // 支付回调地址
  },
};
