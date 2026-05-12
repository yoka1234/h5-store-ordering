import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar, Button, Skeleton, ActionSheet, Toast, ImageViewer, Dialog } from 'antd-mobile';
import { adminGetOrder, adminUpdateOrderStatus, adminUploadDeliveryPhoto, adminUpdateOrderItems, adminConfirmPayment } from '../../api/client';
import { formatPrice, ORDER_STATUS_MAP } from '../../utils/format';
import './OrderDetailPage.css';

const NEXT_STATUS = {
  pending: 'confirmed',
  confirmed: 'delivering',
};

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionVisible, setActionVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const fetchOrder = () => {
    adminGetOrder(id)
      .then((data) => {
        setOrder(data.order);
        setItems(data.items);
        setEditItems(data.items.map((i) => ({
          ...i,
          price: String(i.price),
          quantity: String(i.quantity),
          remark: i.remark || '',
        })));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const statusInfo = order ? ORDER_STATUS_MAP[order.status] : {};
  const canEdit = order && !['completed', 'cancelled'].includes(order.status);
  const canDeliver = order && order.status === 'delivering';

  const handleStatusChange = async (newStatus) => {
    setActionVisible(false);
    try {
      await adminUpdateOrderStatus(id, newStatus);
      fetchOrder();
    } catch {
      Toast.show({ icon: 'fail', content: '操作失败' });
    }
  };

  const startEdit = () => {
    setEditItems(items.map((i) => ({
      ...i,
      price: String(i.price),
      quantity: String(i.quantity),
      remark: i.remark || '',
    })));
    setEditing(true);
  };

  const saveEdit = async () => {
    // Validate
    for (const item of editItems) {
      if (!item.product_name?.trim()) {
        Toast.show({ icon: 'fail', content: '商品名称不能为空' });
        return;
      }
      if (isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0) {
        Toast.show({ icon: 'fail', content: '价格格式错误' });
        return;
      }
      if (isNaN(parseFloat(item.quantity)) || parseFloat(item.quantity) <= 0) {
        Toast.show({ icon: 'fail', content: '数量必须大于0' });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = editItems.map((i) => ({
        product_id: i.product_id || 0,
        product_name: i.product_name,
        price: parseFloat(i.price),
        quantity: parseFloat(i.quantity),
        unit: i.unit || '斤',
        remark: i.remark || '',
      }));
      await adminUpdateOrderItems(order.id, payload);
      Toast.show({ icon: 'success', content: '订单已更新' });
      setEditing(false);
      fetchOrder();
    } catch (err) {
      Toast.show({ icon: 'fail', content: err.response?.data?.message || '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    setEditItems([...editItems, { product_id: 0, product_name: '', price: '0', quantity: '1', unit: '斤' }]);
  };

  const removeEditItem = (idx) => {
    if (editItems.length <= 1) {
      Toast.show({ icon: 'fail', content: '至少保留一个商品' });
      return;
    }
    setEditItems(editItems.filter((_, i) => i !== idx));
  };

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('note', '已拍照送达');
      await adminUploadDeliveryPhoto(order.id, formData);
      Toast.show({ icon: 'success', content: '送达确认成功' });
      fetchOrder();
    } catch {
      Toast.show({ icon: 'fail', content: '上传失败' });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmPayment = () => {
    Dialog.confirm({
      content: '确认该订单已通过扫码收款？',
      onConfirm: async () => {
        try {
          await adminConfirmPayment(order.id);
          Toast.show({ icon: 'success', content: '已确认收款' });
          fetchOrder();
        } catch (err) {
          Toast.show({ icon: 'fail', content: err.response?.data?.message || '操作失败' });
        }
      },
    });
  };

  const isPaid = order?.paid_at;

  const editTotal = editItems.reduce((sum, i) => sum + parseFloat(i.price || 0) * parseFloat(i.quantity || 0), 0);

  if (loading) {
    return (
      <div className="order-detail">
        <NavBar onBack={() => navigate(-1)}>订单详情</NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph animated lineCount={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="order-detail">
      <NavBar onBack={() => navigate(-1)}>订单详情</NavBar>

      {order && (
        <>
          <div className="od-header">
            <div className="od-status" style={{ color: statusInfo.color }}>{statusInfo.label}</div>
            <div className="od-number">{order.order_number}</div>
          </div>

          <div className="od-section">
            <div className="od-section-title">顾客信息</div>
            <div className="od-row"><span className="od-label">姓名</span><span>{order.customer_name}</span></div>
            <div className="od-row"><span className="od-label">手机</span><span>{order.customer_phone}</span></div>
            <div className="od-row"><span className="od-label">地址</span><span>{order.customer_address}</span></div>
            {order.remark && <div className="od-row"><span className="od-label">备注</span><span>{order.remark}</span></div>}
          </div>

          <div className="od-section">
            <div className="od-section-title">配送信息</div>
            <div className="od-row"><span className="od-label">日期</span><span>{order.delivery_date}</span></div>
            <div className="od-row"><span className="od-label">时段</span><span>{order.slot_name}</span></div>
          </div>

          {/* Editable items */}
          <div className="od-section">
            <div className="od-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>商品明细</span>
              {canEdit && !editing && (
                <Button size="small" color="primary" fill="none" onClick={startEdit}>修改</Button>
              )}
            </div>

            {editing ? (
              <div className="od-edit-list">
                {editItems.map((item, idx) => (
                  <div key={idx} className="od-edit-item">
                    <div className="odei-row">
                      <input
                        className="odei-input odei-name"
                        placeholder="商品名"
                        value={item.product_name}
                        onChange={(e) => {
                          const next = [...editItems];
                          next[idx].product_name = e.target.value;
                          setEditItems(next);
                        }}
                      />
                      {item.product_name?.endsWith('（代购）') && <span className="odi-proxy-badge">代购</span>}
                      <button className="odei-del" onClick={() => removeEditItem(idx)}>×</button>
                    </div>
                    <div className="odei-row">
                      <span className="odei-label-sm">单价</span>
                      <input
                        className="odei-input odei-num"
                        type="number"
                        step="0.1"
                        value={item.price}
                        onChange={(e) => {
                          const next = [...editItems];
                          next[idx].price = e.target.value;
                          setEditItems(next);
                        }}
                      />
                      <span className="odei-label-sm">数量</span>
                      <input
                        className="odei-input odei-num"
                        type="number"
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...editItems];
                          next[idx].quantity = e.target.value;
                          setEditItems(next);
                        }}
                      />
                      <select
                        className="odei-select"
                        value={item.unit}
                        onChange={(e) => {
                          const next = [...editItems];
                          next[idx].unit = e.target.value;
                          setEditItems(next);
                        }}
                      >
                        <option value="斤">斤</option>
                        <option value="只">只</option>
                        <option value="个">个</option>
                        <option value="条">条</option>
                        <option value="份">份</option>
                        <option value="块">块</option>
                        <option value="袋">袋</option>
                        <option value="kg">kg</option>
                      </select>
                    </div>
                    <div className="odei-subtotal">
                      小计 {formatPrice(parseFloat(item.price || 0) * parseFloat(item.quantity || 0))}
                    </div>
                    <input
                      className="odei-remark"
                      placeholder="备注（选填）"
                      value={item.remark || ''}
                      onChange={(e) => {
                        const next = [...editItems];
                        next[idx].remark = e.target.value;
                        setEditItems(next);
                      }}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Button size="small" fill="outline" onClick={addItem}>+ 添加商品</Button>
                  <Button size="small" color="primary" loading={saving} onClick={saveEdit}>保存</Button>
                  <Button size="small" fill="none" onClick={() => setEditing(false)}>取消</Button>
                </div>
                <div className="odei-total">
                  修改后合计 <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-danger)' }}>{formatPrice(editTotal)}</span>
                </div>
              </div>
            ) : (
              <>
                {items.map((item) => (
                  <div key={item.id} className="od-item-wrap">
                    <div className="od-item">
                      <span className="odi-name">
                        {item.product_name}
                        {item.product_name?.endsWith('（代购）') && <span className="odi-proxy-badge">代购</span>}
                      </span>
                      <span className="odi-qty">x {item.quantity}{item.unit}</span>
                      <span className="odi-subtotal">{formatPrice(item.subtotal)}</span>
                    </div>
                    {item.remark && <div className="odi-remark">{item.remark}</div>}
                  </div>
                ))}
                <div className="od-item od-item-total">
                  <span>合计</span>
                  <span className="odi-total-amount">{formatPrice(order.total_amount)}</span>
                </div>
              </>
            )}
          </div>

          {/* Payment Status */}
          <div className="od-section">
            <div className="od-section-title">收款状态</div>
            {isPaid ? (
              <div className="od-payment-paid">
                <div className="od-payment-icon">&#10003;</div>
                <div className="od-payment-info">
                  <div className="od-payment-label">
                    已收款
                    <span className="od-payment-method-tag">
                      {order.payment_method === 'wechat' ? '微信支付' : '扫码收款'}
                    </span>
                  </div>
                  <div className="od-payment-time">{order.paid_at}</div>
                  {order.transaction_id && (
                    <div className="od-payment-txn">交易号: {order.transaction_id}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="od-payment-unpaid">
                <div className="od-payment-label">未付款</div>
                <Button
                  size="small"
                  color="warning"
                  fill="solid"
                  onClick={handleConfirmPayment}
                >
                  确认收款（扫码）
                </Button>
              </div>
            )}
          </div>

          {/* Delivery Photo */}
          {order.delivery_photo && (
            <div className="od-section">
              <div className="od-section-title">送达照片</div>
              <img
                src={order.delivery_photo}
                alt="送达照片"
                className="od-delivery-photo"
                onClick={() => setPreviewVisible(true)}
              />
              {order.delivery_note && <div className="od-delivery-note">{order.delivery_note}</div>}
              <ImageViewer image={order.delivery_photo} visible={previewVisible} onClose={() => setPreviewVisible(false)} />
            </div>
          )}

          <div className="od-actions">
            {canDeliver && (
              <>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleUploadPhoto} style={{ display: 'none' }} />
                <Button block color="primary" size="large" loading={uploading} onClick={() => fileRef.current?.click()}>
                  拍照确认送达
                </Button>
                <div style={{ height: 8 }} />
              </>
            )}

            {NEXT_STATUS[order.status] && (
              <Button block color="primary" size="large" onClick={() => handleStatusChange(NEXT_STATUS[order.status])}>
                {order.status === 'pending' ? '确认订单' : '开始配送'}
              </Button>
            )}

            {canDeliver && <div style={{ height: 8 }} />}
            {order.status !== 'completed' && order.status !== 'cancelled' && (
              <Button block size="large" onClick={() => setActionVisible(true)}>更多操作</Button>
            )}
          </div>

          <ActionSheet
            visible={actionVisible}
            actions={[
              { text: order.status === 'cancelled' ? '恢复为待确认' : '取消订单', key: 'cancelled', danger: order.status !== 'cancelled' },
              ...(order.status === 'cancelled' ? [{ text: '恢复为待确认', key: 'pending' }] : []),
            ]}
            onAction={(action) => handleStatusChange(action.key)}
            onClose={() => setActionVisible(false)}
            cancelText="关闭"
          />
        </>
      )}
    </div>
  );
}
