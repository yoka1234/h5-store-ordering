import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Card, Skeleton, Empty, ImageViewer } from 'antd-mobile';
import { lookupCustomer, lookupOrder, getPaymentInfo, requestPayment, listCustomerOrders } from '../../api/client';
import { formatPrice, ORDER_STATUS_MAP, formatDateFull } from '../../utils/format';
import './MyPage.css';

export default function MyPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('last_phone');
    if (saved) {
      setPhone(saved);
      doSearch(saved);
    }
  }, []);

  const doSearch = async (phoneNumber) => {
    const tel = phoneNumber || phone;
    if (!/^1[3-9]\d{9}$/.test(tel)) return;

    setLoading(true);
    setSearched(true);
    try {
      // Lookup customer to get basic info
      const custRes = await lookupCustomer(tel);
      if (custRes.found) {
        setCustomer(custRes.customer);
        // Fetch customer's recent orders
        try {
          const orderRes = await listCustomerOrders(tel);
          setOrders(orderRes.orders || []);
        } catch {
          setOrders([]);
        }
      } else {
        setCustomer(null);
        setOrders([]);
        setLoading(false);
        return;
      }
    } catch {
      setCustomer(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (phone) {
      localStorage.setItem('last_phone', phone);
      doSearch(phone);
    }
  };

  return (
    <div className="my-page">
      <div className="my-header">
        <h2 className="my-title">我的</h2>
      </div>

      {/* Phone input */}
      <div className="my-phone-bar">
        <input
          className="my-phone-input"
          placeholder="输入手机号查看订单"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="my-search-btn" onClick={handleSearch}>查询</button>
      </div>

      {loading && (
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph animated lineCount={3} />
        </div>
      )}

      {searched && !loading && !customer && (
        <Empty description="未找到该手机号的订单记录" style={{ marginTop: '20%' }} />
      )}

      {customer && (
        <>
          {/* Customer info card */}
          <Card className="my-customer-card">
            <div className="mcc-row">
              <span className="mcc-label">姓名</span>
              <span className="mcc-value">{customer.name}</span>
            </div>
            <div className="mcc-row">
              <span className="mcc-label">手机</span>
              <span className="mcc-value">{customer.phone}</span>
            </div>
            <div className="mcc-row">
              <span className="mcc-label">地址</span>
              <span className="mcc-value">{customer.address}</span>
            </div>
            <div className="mcc-row">
              <span className="mcc-label">累计下单</span>
              <span className="mcc-value" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{customer.order_count} 单</span>
            </div>
          </Card>

          {/* Recent orders list */}
          <div className="my-section-title">最近订单</div>
          {orders.length === 0 ? (
            <div className="my-no-orders">暂无订单记录</div>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                phone={phone}
                onPreview={setPreviewImg}
              />
            ))
          )}

          {/* Order number lookup */}
          <div className="my-section-title">订单查询</div>
          <OrderLookupInline phone={phone} onPreview={setPreviewImg} />
        </>
      )}

      {previewImg && (
        <ImageViewer image={previewImg} visible onClose={() => setPreviewImg(null)} />
      )}
    </div>
  );
}

function OrderCard({ order, phone, onPreview }) {
  const [expanded, setExpanded] = useState(false);
  const [payInfo, setPayInfo] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payMsg, setPayMsg] = useState(null);
  const isWechat = /MicroMessenger/i.test(navigator.userAgent);

  const statusInfo = ORDER_STATUS_MAP[order.status];
  const showPayment = ['confirmed', 'delivering', 'completed'].includes(order.status);

  useEffect(() => {
    if (expanded && showPayment) {
      setPayAmount(String(order.total_amount));
      getPaymentInfo().then(setPayInfo).catch(() => {});
    }
  }, [expanded]);

  const handleWechatPay = async () => {
    setPayLoading(true);
    setPayMsg(null);
    try {
      const data = await requestPayment(order.order_number);
      const invokePay = () => {
        WeixinJSBridge.invoke(
          'getBrandWCPayRequest',
          {
            appId: data.appId,
            timeStamp: data.timeStamp,
            nonceStr: data.nonceStr,
            package: data.package,
            signType: data.signType,
            paySign: data.paySign,
          },
          (res) => {
            if (res.err_msg === 'get_brand_wcpay_request:ok') {
              setPayMsg({ type: 'success', text: '支付成功！' });
            } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
              setPayMsg({ type: 'info', text: '已取消支付' });
            } else {
              setPayMsg({ type: 'error', text: res.err_msg || '支付失败' });
            }
          }
        );
      };
      if (typeof WeixinJSBridge === 'undefined') {
        document.addEventListener('WeixinJSBridgeReady', invokePay, false);
      } else {
        invokePay();
      }
    } catch (err) {
      const msg = err.response?.data?.error || '发起支付失败，请稍后再试';
      setPayMsg({ type: 'error', text: msg });
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="my-order-card">
      <div className="moc-header" onClick={() => setExpanded(!expanded)}>
        <div className="moc-top">
          <span className="moc-status" style={{ color: statusInfo?.color }}>{statusInfo?.label}</span>
          <span className="moc-number">{order.order_number}</span>
        </div>
        <div className="moc-meta">
          {order.delivery_date} · {order.slot_name} · {formatPrice(order.total_amount)}
        </div>
        <div className="moc-items-preview">
          {order.items?.slice(0, 3).map((item, i) => (
            <span key={i} className="moc-item-tag">{item.product_name} x{item.quantity}</span>
          ))}
          {order.items?.length > 3 && <span className="moc-item-more">等{order.items.length}件</span>}
        </div>
        <div className={`moc-arrow ${expanded ? 'moc-arrow-up' : ''}`}>›</div>
      </div>

      {expanded && (
        <div className="moc-detail">
          {order.items?.map((item) => (
            <div key={item.id}>
              <div className="moc-item-row">
                <span>{item.product_name}</span>
                <span className="moc-item-right">
                  x{item.quantity}{item.unit} {formatPrice(item.subtotal)}
                </span>
              </div>
              {item.remark && <div className="moc-item-remark">{item.remark}</div>}
            </div>
          ))}
          <div className="moc-total-row">
            合计 <span className="moc-total-amount">{formatPrice(order.total_amount)}</span>
          </div>

          {order.delivery_photo && (
            <div className="moc-photo">
              <div className="moc-photo-label">送达照片</div>
              <img
                src={order.delivery_photo}
                alt="送达照片"
                className="moc-photo-img"
                onClick={() => onPreview(order.delivery_photo)}
              />
            </div>
          )}

          {/* Payment section */}
          {showPayment && (
            <div className="moc-pay">
              <div className="moc-pay-title">{order.status === 'completed' ? '请付款' : '可提前付款'}</div>
              <div className="moc-pay-row">
                <span className="moc-pay-label">金额</span>
                <div className="moc-pay-amount-input">
                  <span className="moc-pay-yuan">¥</span>
                  <input
                    className="moc-pay-input"
                    type="number"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>
              </div>
              <button className="moc-pay-btn" disabled={payLoading} onClick={handleWechatPay}>
                {payLoading ? '发起支付...' : '微信支付'}
              </button>
              {!isWechat && <div className="moc-pay-wechat-hint">请在微信中打开以完成支付</div>}
              {payMsg && <div className={`moc-pay-msg moc-pay-msg-${payMsg.type}`}>{payMsg.text}</div>}
              {payInfo?.payment_qrcode && (
                <>
                  <div className="moc-pay-divider">或扫码付款</div>
                  <img
                    src={payInfo.payment_qrcode} alt="收款码"
                    className="moc-pay-qr"
                    onClick={() => onPreview(payInfo.payment_qrcode)}
                  />
                  <div className="moc-pay-method-text">{payInfo.payment_method}</div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderLookupInline({ phone, onPreview }) {
  const [orderNumber, setOrderNumber] = useState('');
  const [result, setResult] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [payInfo, setPayInfo] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payMsg, setPayMsg] = useState(null);
  const isWechat = /MicroMessenger/i.test(navigator.userAgent);

  const handleLookup = async () => {
    if (!orderNumber.trim()) return;
    setLoading(true);
    setError(false);
    setPayInfo(null);
    try {
      const data = await lookupOrder(orderNumber.trim());
      if (data.order.customer_phone === phone) {
        setResult(data.order);
        setItems(data.items);
        setPayAmount(String(data.order.total_amount));
        // Fetch payment QR code
        getPaymentInfo().then(setPayInfo).catch(() => {});
      } else {
        setError(true);
        setResult(null);
      }
    } catch {
      setError(true);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleWechatPay = async () => {
    setPayLoading(true);
    setPayMsg(null);
    try {
      const data = await requestPayment(result.order_number);

      const invokePay = () => {
        WeixinJSBridge.invoke(
          'getBrandWCPayRequest',
          {
            appId: data.appId,
            timeStamp: data.timeStamp,
            nonceStr: data.nonceStr,
            package: data.package,
            signType: data.signType,
            paySign: data.paySign,
          },
          (res) => {
            if (res.err_msg === 'get_brand_wcpay_request:ok') {
              setPayMsg({ type: 'success', text: '支付成功！' });
            } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
              setPayMsg({ type: 'info', text: '已取消支付' });
            } else {
              setPayMsg({ type: 'error', text: res.err_msg || '支付失败' });
            }
          }
        );
      };

      if (typeof WeixinJSBridge === 'undefined') {
        document.addEventListener('WeixinJSBridgeReady', invokePay, false);
      } else {
        invokePay();
      }
    } catch (err) {
      const msg = err.response?.data?.error || '发起支付失败，请稍后再试';
      setPayMsg({ type: 'error', text: msg });
    } finally {
      setPayLoading(false);
    }
  };

  const statusInfo = result ? ORDER_STATUS_MAP[result.status] : null;
  const showPayment = result && ['confirmed', 'delivering', 'completed'].includes(result.status);

  return (
    <div className="my-order-lookup">
      <div className="mol-search">
        <input
          className="mol-input"
          placeholder="输入订单号精确查询"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
        />
        <button className="mol-btn" onClick={handleLookup} disabled={loading}>
          {loading ? '...' : '查询'}
        </button>
      </div>

      {error && <div className="mol-error">未找到该订单或不属于当前手机号</div>}

      {result && (
        <div className="mol-result">
          <div className="mol-status" style={{ color: statusInfo?.color }}>{statusInfo?.label}</div>
          <div className="mol-number">{result.order_number}</div>
          <div className="mol-info">
            {result.delivery_date} · {result.slot_name}
          </div>

          <div className="mol-items">
            {items.map((item) => (
              <div key={item.id}>
                <div className="mol-item">
                  <span>{item.product_name}</span>
                  <span className="mol-item-right">
                    x{item.quantity}{item.unit} {formatPrice(item.subtotal)}
                  </span>
                </div>
                {item.remark && <div className="mol-item-remark">{item.remark}</div>}
              </div>
            ))}
            <div className="mol-total">
              合计 <span className="mol-total-amount">{formatPrice(result.total_amount)}</span>
            </div>
          </div>

          {result.delivery_photo && (
            <div className="mol-photo">
              <div className="mol-photo-label">送达照片</div>
              <img
                src={result.delivery_photo}
                alt="送达照片"
                className="mol-photo-img"
                onClick={() => onPreview(result.delivery_photo)}
              />
            </div>
          )}

          {/* Payment Section — show after confirmed */}
          {showPayment && (
            <div className="mol-pay-section">
              <div className="mol-pay-title">{result.status === 'completed' ? '请付款' : '订单已确认，可提前付款'}</div>

              {/* Amount input */}
              <div className="mol-pay-amount-row">
                <span className="mol-pay-label">付款金额</span>
                <div className="mol-pay-amount-input">
                  <span className="mol-pay-yuan">¥</span>
                  <input
                    className="mol-pay-input"
                    type="number"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* WeChat Pay button */}
              <button
                className="mol-pay-btn"
                disabled={payLoading}
                onClick={handleWechatPay}
              >
                {payLoading ? '发起支付...' : '微信支付'}
              </button>
              {!isWechat && (
                <div className="mol-pay-wechat-hint">请在微信中打开此页面以完成支付</div>
              )}

              {/* Pay result message */}
              {payMsg && (
                <div className={`mol-pay-msg mol-pay-msg-${payMsg.type}`}>{payMsg.text}</div>
              )}

              {/* QR Code fallback */}
              {payInfo?.payment_qrcode && (
                <>
                  <div className="mol-pay-divider">或扫码付款</div>
                  <div className="mol-pay-qr-wrap">
                    <img
                      src={payInfo.payment_qrcode} alt="收款码"
                      className="mol-pay-qr"
                      onClick={() => onPreview(payInfo.payment_qrcode)}
                    />
                  </div>
                  <div className="mol-pay-method">{payInfo.payment_method}</div>
                </>
              )}
            </div>
          )}

          {showPayment && !payInfo && (
            <div className="mol-payment-hint">商品已送达，请记得扫码付款</div>
          )}
        </div>
      )}
    </div>
  );
}
