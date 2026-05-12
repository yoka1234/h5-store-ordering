import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button, NavBar } from 'antd-mobile';
import { lookupOrder } from '../../api/client';
import { formatPrice, ORDER_STATUS_MAP } from '../../utils/format';
import './OrderConfirmPage.css';

export default function OrderConfirmPage() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (orderNumber) {
      lookupOrder(orderNumber)
        .then((data) => {
          setOrder(data.order);
          setItems(data.items);
        })
        .catch(() => {});
    }
  }, [orderNumber]);

  const statusInfo = ORDER_STATUS_MAP[order?.status] || ORDER_STATUS_MAP.pending;

  return (
    <div className="success-page">
      <NavBar onBack={() => navigate('/')}>下单成功</NavBar>

      {order && (
        <>
          <div className="success-header">
            <div className="success-icon">✓</div>
            <div className="success-title">下单成功</div>
            <div className="success-number">订单号：{order.order_number}</div>
          </div>

          <div className="success-reminder">
            请截图保存订单号，方便查询配送进度。商品送达后请扫码付款。
          </div>

          <div className="success-info">
            <div className="info-row">
              <span className="info-label">配送日期</span>
              <span>{order.delivery_date}</span>
            </div>
            <div className="info-row">
              <span className="info-label">配送时段</span>
              <span>{order.slot_name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">订单状态</span>
              <span style={{ color: statusInfo.color }}>{statusInfo.label}</span>
            </div>
          </div>

          <div className="success-items">
            {items.map((item) => (
              <div key={item.id} className="s-item">
                <span className="s-item-name">{item.product_name}</span>
                <span className="s-item-qty">×{item.quantity}{item.unit}</span>
                <span className="s-item-subtotal">{formatPrice(item.subtotal)}</span>
              </div>
            ))}
            <div className="s-item s-item-total">
              <span>合计</span>
              <span className="s-total-amount">{formatPrice(order.total_amount)}</span>
            </div>
          </div>

          <div className="success-actions">
            <Button block color="primary" size="large" onClick={() => navigate('/')}>
              返回首页
            </Button>
            <div style={{ height: 12 }} />
            <Button block size="large" onClick={() => navigate('/order/lookup')}>
              查询订单
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
