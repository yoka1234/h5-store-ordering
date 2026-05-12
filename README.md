# 陈记海鲜 — H5 线下门店订购系统

海鲜门店在线下单系统，支持顾客自助选购、AI 智能推荐、商家后台管理。

## 功能

### 顾客端
- **配送选择** — 选择配送日期（未来 7 天）和时段（午餐/晚餐）
- **商品浏览** — 按分类筛选，特价/推荐/热卖标签商品置顶
- **购物车** — 加减商品、去结算
- **AI 智能选购** — 自然语言描述需求，AI 自动匹配商品
- **订单查询** — 输入手机号查看历史订单
- **支付** — 微信支付 / 线下收款码

### 商家后台
- **仪表盘** — 按日期+时段查看订单概览、销售额
- **订单管理** — 状态流转（待确认→已确认→配送中→已完成），修改商品、确认收款、上传配送照片
- **商品管理** — 增删改查，标签设置（今日特价/推荐/新品/热卖）
- **AI 商品管理** — 自然语言批量管理商品
- **分类管理** / **时段设置**

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + Vite |
| 后端 | Node.js + Express |
| 数据库 | SQLite |
| AI | DeepSeek API |
| 支付 | 微信支付 |
| 反向代理 | Caddy（自动 SSL） |

## 快速开始

```bash
# 1. 安装依赖
npm run setup

# 2. 配置环境变量
cp server/.env.example server/.env
# 编辑 server/.env，填入 DeepSeek API Key 等配置

# 3. 启动开发环境（前后端同时启动）
npm run dev
```

- 顾客端：`http://localhost:5173`
- 后端 API：`http://localhost:3001`
- 后台管理：`http://localhost:5173/admin/login`

## 部署

```bash
# 构建前端
npm run build

# 启动生产环境
npm start
```

推荐使用 Caddy / Nginx 反向代理并配置 SSL。

## 后台默认账号

| 字段 | 默认值 |
|---|---|
| 用户名 | `admin` |
| 密码 | 部署时在 `.env` 中设置 |

## 环境变量

| 变量 | 说明 |
|---|---|
| `PORT` | 服务端口（默认 3001） |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |
| `JWT_SECRET` | JWT 签名密钥 |
| `ADMIN_PASSWORD` | 后台管理密码 |
| `WXPAY_ENABLED` | 是否启用微信支付 |

## License

[Apache 2.0](LICENSE)
