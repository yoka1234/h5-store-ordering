import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Toast, ImageViewer } from 'antd-mobile';
import { lookupOrder } from '../../api/client';
import { formatPrice, ORDER_STATUS_MAP } from '../../utils/format';
import './OrderLookupPage.css';

export default function OrderLookupPage() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('');
  const [result, setResult] = useState(null);
  const [items, setItems] = useState([]);
  const [searched, setSearched] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const handleSearch = async () => {
    if (!orderNumber.trim()) {
      Toast.show({ icon: 'fail', content: '请输入订单号' });
      return;
    }
    try {
      const data = await lookupOrder(orderNumber.trim());
      setResult(data.order);
      setItems(data.items);
      setSearched(true);
    } catch {
      setResult(null);
      setItems([]);
      setSearched(true);
    }
  };

  const statusInfo = result ? ORDER_STATUS_MAP[result.status] || ORDER_STATUS_MAP.pending : null;

  return (
    <div className="lookup-page">
      <NavBar onBack={() => navigate('/')}>查询订单</NavBar>

      <div className="lookup-search">
        <div className="lookup-search-bar">
          <input
            className="lookup-input"
            placeholder="输入订单号，如 20260427001"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="lookup-btn" onClick={handleSearch}>查询</button>
        </div>
      </div>

      {searched && !result && (
        <div className="lookup-empty">未找到该订单</div>
      )}

      {result && (
        <div className="lookup-result">
          <div className="lookup-status" style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </div>
          <div className="lookup-number">订单号：{result.order_number}</div>

          <div className="lookup-info">
            <div className="info-row">
              <span className="info-label">配送日期</span>
              <span>{result.delivery_date}</span>
            </div>
            <div className="info-row">
              <span className="info-label">配送时段</span>
              <span>{result.slot_name}</span>
            </div>
          </div>

          <div className="lookup-items">
            <div className="lookup-section-title">订单商品</div>
            {items.map((item) => (
              <div key={item.id} className="lookup-item">
                <span className="li-name">{item.product_name}</span>
                <span className="li-qty">x {item.quantity}{item.unit}</span>
                <span className="li-subtotal">{formatPrice(item.subtotal)}</span>
              </div>
            ))}
            <div className="lookup-total">
              合计：<span className="lookup-total-amount">{formatPrice(result.total_amount)}</span>
            </div>
          </div>

          {/* Delivery Photo */}
          {result.delivery_photo && (
            <div className="lookup-photo-section">
              <div className="lookup-section-title">商家已拍照送达</div>
              <img
                src={result.delivery_photo}
                alt="送达照片"
                className="lookup-delivery-photo"
                onClick={() => setPreviewVisible(true)}
              />
              <ImageViewer
                image={result.delivery_photo}
                visible={previewVisible}
                onClose={() => setPreviewVisible(false)}
              />
            </div>
          )}

          {/* Payment Guide */}
          {result.status === 'completed' && (
            <div className="lookup-payment">
              <div className="payment-title">请扫码付款</div>
              <div className="payment-desc">商品已送达，请扫描商家收款码完成付款</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
