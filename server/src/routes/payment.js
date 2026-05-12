const express = require('express');
const router = express.Router();
const { getDb } = require('../database/connection');
const { isConfigured, createJSAPIPayment, generateJSAPISign, decryptNotify } = require('../utils/wechatpay');

// POST /api/pay/prepay — create WeChat payment for an order
router.post('/prepay', async (req, res, next) => {
  try {
    const { orderNumber } = req.body;

    if (!orderNumber) {
      return res.status(400).json({ error: '缺少订单号' });
    }

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    if (!isConfigured()) {
      return res.status(400).json({ error: '微信支付尚未配置' });
    }

    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    // Try JSAPI pay first (for WeChat browser)
    const result = await createJSAPIPayment(order, clientIp);

    if (result.prepay_id) {
      // Save prepay_id to order for tracking
      db.prepare('UPDATE orders SET transaction_id = ? WHERE id = ?').run(result.prepay_id, order.id);

      const jsapiParams = generateJSAPISign(result.prepay_id);
      return res.json({
        type: 'jsapi',
        ...jsapiParams,
      });
    }

    res.status(502).json({ error: '创建支付订单失败' });
  } catch (err) {
    next(err);
  }
});

// POST /api/pay/notify — WeChat Pay callback
router.post('/notify', async (req, res, next) => {
  try {
    const body = req.body;

    if (!body || !body.resource) {
      return res.status(400).json({ code: 'FAIL', message: '格式错误' });
    }

    // Decrypt the notification
    const resource = body.resource;
    const decrypted = decryptNotify(
      resource.ciphertext,
      resource.associated_data,
      resource.nonce
    );

    if (!decrypted) {
      return res.status(400).json({ code: 'FAIL', message: '解密失败' });
    }

    const { out_trade_no, transaction_id } = decrypted;

    if (decrypted.trade_state === 'SUCCESS') {
      const db = getDb();
      db.prepare(
        'UPDATE orders SET transaction_id = ?, paid_at = datetime(\'now\',\'localtime\'), payment_method = \'wechat\' WHERE order_number = ?'
      ).run(transaction_id, out_trade_no);

      console.log(`Payment successful: order ${out_trade_no}, transaction ${transaction_id}`);
    }

    // Always return success to WeChat
    res.status(200).json({ code: 'SUCCESS', message: 'OK' });
  } catch (err) {
    console.error('Payment notify error:', err);
    res.status(500).json({ code: 'FAIL', message: '内部错误' });
  }
});

// GET /api/pay/status/:orderNumber — check payment status
router.get('/status/:orderNumber', (req, res) => {
  try {
    const db = getDb();
    const order = db.prepare(
      'SELECT order_number, transaction_id, paid_at, total_amount FROM orders WHERE order_number = ?'
    ).get(req.params.orderNumber);

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    res.json({
      orderNumber: order.order_number,
      paid: !!order.paid_at,
      transactionId: order.transaction_id || null,
      paidAt: order.paid_at || null,
      amount: order.total_amount,
    });
  } catch (err) {
    console.error('Payment status error:', err);
    res.status(500).json({ error: '查询失败' });
  }
});

module.exports = router;
