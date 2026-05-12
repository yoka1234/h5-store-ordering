const express = require('express');
const router = express.Router();
const https = require('https');
const { getDb } = require('../database/connection');
const config = require('../config');

// POST /api/ai/chat — interpret natural language order
router.post('/chat', (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: '请输入您想要的商品' });
    }

    // Build product catalog for the prompt
    const db = getDb();
    const products = db.prepare(
      `SELECT p.id, p.name, p.price, p.unit, c.name as category
       FROM products p JOIN categories c ON p.category_id = c.id
       WHERE p.is_available = 1 ORDER BY c.sort_order, p.sort_order`
    ).all();

    const catalog = products.map((p) =>
      `[${p.id}] ${p.name} ${p.price}元/${p.unit} (${p.category})`
    ).join('\n');

    const systemPrompt = `你是陈记海鲜的智能导购助手。用户用自然语言告诉你他们想买什么，你必须把每个商品都加入购物车——宁可用代购也不要漏掉任何商品。

商品目录（仅限现货）：
${catalog}

必须严格遵守的规则：
1. 用户提到的每个商品都必须出现在items数组中，一个都不能漏
2. 先在目录中模糊匹配（如"花甲"→"大花甲"，"鲍鱼10头"→"鲍鱼（10头）"，"皮皮虾"→"大皮皮虾"），匹配成功用目录的product_id、price、unit
3. 【最重要】目录中找不到的商品，一律生成代购商品：product_id=0, is_custom=true，price根据海鲜市场行情合理估算（绝不要填0），unit根据常识填写（斤/只/条/个等），reply中标注「代购」
4. 提取数量：如"2斤"→quantity=2，"1条"→quantity=1。未指定数量默认1
5. 推荐场景（如"推荐火锅食材"）：根据预算和人数搭配目录商品+代购商品
6. 仅当用户消息完全与购物无关（如纯闲聊"你好"），才返回空items

只返回JSON：
{"reply":"简要列出商品和价格，代购务必标注「代购」","items":[{"product_id":123,"product_name":"沙虫","quantity":2,"unit":"斤","price":33,"subtotal":66,"is_custom":false}]}
代购格式：{"product_id":0,"product_name":"三文鱼","quantity":1,"unit":"斤","price":45,"subtotal":45,"is_custom":true}`;

    const body = JSON.stringify({
      model: config.DEEPSEEK_MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    });

    const apiUrl = new URL(config.DEEPSEEK_BASE_URL);
    const options = {
      hostname: apiUrl.hostname,
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`,
      },
      timeout: 15000,
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', (chunk) => { data += chunk; });
      apiRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          const text = result.choices?.[0]?.message?.content || '';
          // Extract JSON from response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return res.json(parsed);
          }
          res.json({ reply: '抱歉，我没能理解您的需求，请再试一次。', items: [] });
        } catch {
          // Fallback to keyword match
          const items = keywordMatch(message);
          res.json({ reply: buildReply(items), items });
        }
      });
    });

    apiReq.on('error', () => {
      const items = keywordMatch(message);
      res.json({ reply: buildReply(items), items });
    });

    apiReq.on('timeout', () => {
      apiReq.destroy();
      const items = keywordMatch(message);
      res.json({ reply: buildReply(items), items });
    });

    apiReq.write(body);
    apiReq.end();
  } catch (err) {
    next(err);
  }
});

// Keyword-based fallback matching
function keywordMatch(message) {
  const db = getDb();
  const products = db.prepare(
    `SELECT id, name, price, unit FROM products WHERE is_available = 1`
  ).all();

  // Score each product by longest keyword match in message
  const scored = products.map((p) => {
    const variations = generateKeywords(p.name);
    let bestMatch = '';
    for (const kw of variations) {
      if (message.includes(kw) && kw.length > bestMatch.length) {
        bestMatch = kw;
      }
    }
    return { product: p, match: bestMatch, score: bestMatch.length };
  }).filter((s) => s.score >= 2);

  // Sort by score descending (more specific match first)
  scored.sort((a, b) => b.score - a.score);

  // Filter out sub-matches: if a shorter match is fully contained in a longer match
  const items = [];
  const usedSpans = [];

  for (const s of scored) {
    const idx = message.indexOf(s.match);
    // Check if this match overlaps with an already-used longer match
    const overlaps = usedSpans.some(([start, end]) => idx < end && idx + s.match.length > start);
    if (overlaps) continue;

    // Try to extract quantity near the keyword
    const before = message.substring(Math.max(0, idx - 20), idx);
    // Match pattern like "5只" or "3斤" or just "5" before the keyword
    const qtyMatch = before.match(/(\d+)\s*[只个条斤份块袋]?\s*$/);
    const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;

    items.push({
      product_id: s.product.id,
      product_name: s.product.name,
      quantity: qty,
      unit: s.product.unit,
      price: s.product.price,
      subtotal: parseFloat((s.product.price * qty).toFixed(2)),
    });

    usedSpans.push([idx, idx + s.match.length]);
  }

  return items;
}

// Generate matchable keyword variations from product name
function generateKeywords(name) {
  const keywords = [];
  // Full name
  keywords.push(name);
  // Remove parenthesized parts: "鲍鱼（10头）" → "鲍鱼"
  const cleaned = name.replace(/[（(][^)）]*[)）]/g, '').trim();
  if (cleaned !== name && cleaned.length >= 2) keywords.push(cleaned);
  // Compact version: "鲍鱼（10头）" → "鲍鱼10头"
  const compact = name.replace(/[（(]([^)）]*)[)）]/g, '$1').trim();
  if (compact !== name && compact.length >= 2) keywords.push(compact);
  // Extract parenthesized content as keyword too: "10头"
  const parenMatch = name.match(/[（(]([^)）]*)[)）]/);
  if (parenMatch && parenMatch[1].length >= 2) keywords.push(parenMatch[1]);
  // Split cleaned name by spaces/hyphens
  const parts = cleaned.split(/[-\s]+/);
  if (parts.length > 1) {
    keywords.push(...parts.filter((p) => p.length >= 2));
  }
  // Strip common prefix/suffix modifiers for base name
  const prefixes = ['野生', '特大', '本地', '湛江', '阳山', '文昌', '清远', '三黄', '胡须', '脆皮', '无沙'];
  const suffixes = ['带毛', '杀好', '整只', '（大）', '（大大）', '（油带）', '（爽鳝）', '（波龙）', '（黄鱼）', '（乌鸡）', '（中鸽）', '（腌鸡）'];
  let baseName = cleaned;
  for (const p of prefixes) {
    if (baseName.startsWith(p)) {
      const stripped = baseName.substring(p.length);
      if (stripped.length >= 2) keywords.push(stripped);
    }
  }
  for (const s of suffixes) {
    if (baseName.endsWith(s)) {
      const stripped = baseName.substring(0, baseName.length - s.length);
      if (stripped.length >= 2) keywords.push(stripped);
    }
  }
  // Also strip leading 大/小/老 prefix
  const noLeadingDa = cleaned.replace(/^[大中小老]/, '');
  if (noLeadingDa !== cleaned && noLeadingDa.length >= 2) keywords.push(noLeadingDa);

  return [...new Set(keywords)].sort((a, b) => b.length - a.length);
}

function buildReply(items) {
  if (items.length === 0) return '抱歉，没有找到匹配的商品，请换个说法试试。';
  const list = items.map(i => `${i.product_name} x${i.quantity}${i.unit}（${i.subtotal}元）`).join('、');
  const total = items.reduce((s, i) => s + i.subtotal, 0);
  return `已为您添加：${list}，合计 ${total.toFixed(2)} 元。如需修改请告诉我。`;
}

// POST /api/ai/admin — natural language product management
router.post('/admin', (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: '请输入指令' });
    }

    const db = getDb();
    const products = db.prepare(
      `SELECT p.id, p.name, p.price, p.unit, p.badge, p.is_available, p.is_preorder, p.sort_order, c.name as category
       FROM products p JOIN categories c ON p.category_id = c.id
       ORDER BY p.id`
    ).all();

    const catalog = products.map((p) =>
      `ID=${p.id} | ${p.name} | ${p.price}元/${p.unit} | 标签=${p.badge || '无'} | 分类=${p.category} | ${p.is_available ? '上架' : '下架'} | ${p.is_preorder ? '预售' : '现货'}`
    ).join('\n');

    const systemPrompt = `你是陈记海鲜后台管理助手。根据用户自然语言指令，分析意图并返回JSON操作列表。

商品目录：
${catalog}

支持的操作类型：
- set_badge: 设置商品标签（今日特价、推荐、新品、热卖、无）
- set_price: 修改商品价格
- set_unit: 修改商品单位
- set_preorder: 设置预售状态（true/false）
- toggle_available: 上架/下架（true=上架, false=下架）
- set_category: 修改分类（先匹配已有分类名，匹配不到用原分类）

规则：
1. 仔细匹配用户提到的商品名称与目录中的商品，模糊匹配即可（如"皮皮虾"匹配"大皮皮虾"）
2. 用户说"虾类"、"虾"→匹配名称含"虾"的所有商品；"蟹类"→含"蟹"；"鱼类"→含"鱼"；"螺"→含"螺"；"贝"→含"贝"；"鸡"→含"鸡"；"鸭"→含"鸭"
3. 用户说"全部"、"所有商品"→所有商品
4. 每个匹配商品生成一条操作
5. 移除标签：badge设为""
6. 仅返回JSON，格式：{"reply":"简要说明做了什么","operations":[{"product_id":1,"product_name":"沙虫","action":"set_badge","params":{"badge":"今日特价"}}]}`;

    const body = JSON.stringify({
      model: config.DEEPSEEK_MODEL,
      max_tokens: 2048,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    });

    const apiUrl = new URL(config.DEEPSEEK_BASE_URL);
    const options = {
      hostname: apiUrl.hostname,
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`,
      },
      timeout: 60000,
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', (chunk) => { data += chunk; });
      apiRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          const text = result.choices?.[0]?.message?.content || '';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            return res.json({ reply: '抱歉，没能理解您的指令。', operations: [] });
          }
          const parsed = JSON.parse(jsonMatch[0]);
          const ops = parsed.operations || [];

          // Execute operations
          const results = [];
          for (const op of ops) {
            try {
              executeOperation(db, op);
              results.push({ product_id: op.product_id, product_name: op.product_name, action: op.action, success: true });
            } catch (err) {
              results.push({ product_id: op.product_id, product_name: op.product_name, action: op.action, success: false, error: err.message });
            }
          }

          res.json({ reply: parsed.reply || '操作完成', operations: results });
        } catch {
          res.json({ reply: 'AI 响应解析失败，请换个说法试试。', operations: [] });
        }
      });
    });

    apiReq.on('error', () => {
      res.status(500).json({ error: 'AI 服务暂时不可用，请稍后重试' });
    });

    apiReq.on('timeout', () => {
      apiReq.destroy();
      res.status(504).json({ error: 'AI 服务响应超时' });
    });

    apiReq.write(body);
    apiReq.end();
  } catch (err) {
    next(err);
  }
});

function executeOperation(db, op) {
  const { product_id, action, params } = op;
  switch (action) {
    case 'set_badge':
      db.prepare('UPDATE products SET badge = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
        .run(params.badge || null, product_id);
      break;
    case 'set_price':
      db.prepare('UPDATE products SET price = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
        .run(parseFloat(params.price), product_id);
      break;
    case 'set_unit':
      db.prepare('UPDATE products SET unit = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
        .run(params.unit, product_id);
      break;
    case 'set_preorder':
      db.prepare('UPDATE products SET is_preorder = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
        .run(params.preorder ? 1 : 0, product_id);
      break;
    case 'toggle_available':
      db.prepare('UPDATE products SET is_available = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
        .run(params.available ? 1 : 0, product_id);
      break;
    case 'set_category': {
      // Find category by name
      const cat = db.prepare('SELECT id FROM categories WHERE name LIKE ?').get(`%${params.category}%`);
      const catId = cat ? cat.id : null;
      if (catId) {
        db.prepare('UPDATE products SET category_id = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
          .run(catId, product_id);
      }
      break;
    }
  }
}

module.exports = router;
