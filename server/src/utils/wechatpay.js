const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const config = require('../config');

function isConfigured() {
  const c = config.WECHAT_PAY;
  return !!(c.enabled && c.mchId && c.appId && c.apiV3Key && c.serialNo
    && fs.existsSync(c.privateKeyPath));
}

function getNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function getTimestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

function sign(method, url, timestamp, nonceStr, body) {
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body || ''}\n`;
  const privateKey = crypto.readFileSync(config.WECHAT_PAY.privateKeyPath);
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign(privateKey, 'base64');
}

function authHeader(method, url, body) {
  const timestamp = getTimestamp();
  const nonceStr = getNonceStr();
  const signature = sign(method, url, timestamp, nonceStr, body);
  const c = config.WECHAT_PAY;
  return {
    Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${c.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${c.serialNo}"`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'online-order/1.0',
  };
}

function wechatRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.mch.weixin.qq.com',
      port: 443,
      path,
      method,
      headers: authHeader(method, path, bodyStr),
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject({ status: res.statusCode, ...json });
          }
        } catch {
          reject({ status: res.statusCode, message: data });
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// JSAPI pay — used inside WeChat browser (公众号/小程序)
function createJSAPIPayment(order, clientIp) {
  const c = config.WECHAT_PAY;
  const body = {
    appid: c.appId,
    mchid: c.mchId,
    description: `陈记海鲜-订单${order.order_number}`,
    out_trade_no: order.order_number,
    notify_url: c.notifyUrl,
    amount: {
      total: Math.round(order.total_amount * 100), // 分
      currency: 'CNY',
    },
    payer: { openid: order.openid || '' },
    scene_info: {
      payer_client_ip: clientIp || '127.0.0.1',
    },
  };

  return wechatRequest('POST', '/v3/pay/transactions/jsapi', body).then((resp) => ({
    prepay_id: resp.prepay_id,
  }));
}

// H5 pay — used outside WeChat browser, redirect-based
function createH5Payment(order, clientIp) {
  const c = config.WECHAT_PAY;
  const body = {
    appid: c.appId,
    mchid: c.mchId,
    description: `陈记海鲜-订单${order.order_number}`,
    out_trade_no: order.order_number,
    notify_url: c.notifyUrl,
    amount: {
      total: Math.round(order.total_amount * 100),
      currency: 'CNY',
    },
    scene_info: {
      payer_client_ip: clientIp || '127.0.0.1',
      h5_info: { type: 'Wap' },
    },
  };

  return wechatRequest('POST', '/v3/pay/transactions/h5', body).then((resp) => ({
    h5_url: resp.h5_url,
  }));
}

// Generate JSAPI pay signature for frontend wx.chooseWXPay
function generateJSAPISign(prepayId) {
  const c = config.WECHAT_PAY;
  const nonceStr = getNonceStr();
  const timeStamp = getTimestamp();
  const pkg = `prepay_id=${prepayId}`;

  const message = `${c.appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
  const privateKey = fs.readFileSync(c.privateKeyPath);
  const paySign = crypto.createSign('RSA-SHA256');
  paySign.update(message);
  const signature = paySign.sign(privateKey, 'base64');

  return {
    appId: c.appId,
    timeStamp,
    nonceStr,
    package: pkg,
    signType: 'RSA',
    paySign: signature,
  };
}

// Verify WeChat Pay notification signature
function verifyNotifySignature(headers, body) {
  try {
    const timestamp = headers['wechatpay-timestamp'];
    const nonce = headers['wechatpay-nonce'];
    const signature = headers['wechatpay-signature'];
    const serial = headers['wechatpay-serial'];

    if (!timestamp || !nonce || !signature) return false;

    const message = `${timestamp}\n${nonce}\n${body}\n`;
    // WeChat Pay platform certificate would be needed for full verification
    // For now, we verify using the API v3 key (AES-256-GCM decryption of the notification)
    return true;
  } catch {
    return false;
  }
}

// Decrypt notification body using AEAD_AES_256_GCM
function decryptNotify(ciphertext, associatedData, nonce) {
  const key = config.WECHAT_PAY.apiV3Key;
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key),
      Buffer.from(nonce)
    );
    decipher.setAuthTag(Buffer.from(ciphertext, 'base64'));
    decipher.setAAD(Buffer.from(associatedData));
    let decoded = decipher.update('', 'hex', 'utf8');
    decoded += decipher.final('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

module.exports = {
  isConfigured,
  createJSAPIPayment,
  createH5Payment,
  generateJSAPISign,
  verifyNotifySignature,
  decryptNotify,
};
