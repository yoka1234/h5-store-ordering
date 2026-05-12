import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Form, Input, TextArea, Toast } from 'antd-mobile';
import useCartStore from '../../store/cartStore';
import useOrderStore from '../../store/orderStore';
import { createOrder, lookupCustomer } from '../../api/client';
import { formatPrice } from '../../utils/format';
import './CheckoutPage.css';

const LAST_PHONE_KEY = 'last_phone';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const selectedDate = useOrderStore((s) => s.selectedDate);
  const selectedSlot = useOrderStore((s) => s.selectedSlot);
  const [submitting, setSubmitting] = useState(false);
  const [phoneLookedUp, setPhoneLookedUp] = useState(false);

  const [form] = Form.useForm();

  // On mount, try to auto-fill from last phone
  useEffect(() => {
    const lastPhone = localStorage.getItem(LAST_PHONE_KEY);
    if (lastPhone) {
      form.setFieldsValue({ customer_phone: lastPhone });
      tryLookup(lastPhone);
    }
  }, []);

  const tryLookup = useCallback(async (phone) => {
    if (!/^1[3-9]\d{9}$/.test(phone)) return;
    try {
      const res = await lookupCustomer(phone.trim());
      if (res.found) {
        form.setFieldsValue({
          customer_name: res.customer.name,
          customer_address: res.customer.address,
        });
        setPhoneLookedUp(true);
        Toast.show({ icon: 'success', content: `欢迎回来！已自动填写信息` });
      }
    } catch {}
  }, [form]);

  const handlePhoneBlur = () => {
    const phone = form.getFieldValue('customer_phone');
    if (phone && !phoneLookedUp) {
      tryLookup(phone);
    }
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }

    const values = form.getFieldsValue();

    if (items.length === 0) {
      Toast.show({ icon: 'fail', content: '购物车为空' });
      return;
    }

    setSubmitting(true);
    try {
      const data = await createOrder({
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_address: values.customer_address,
        delivery_date: selectedDate,
        time_slot_id: selectedSlot.id,
        remark: values.remark || '',
        items: items.map((i) => ({
          product_id: i.is_custom ? 0 : i.product_id,
          product_name: i.product_name,
          price: i.price,
          quantity: i.quantity,
          unit: i.unit,
          remark: i.remark || '',
          is_custom: i.is_custom || false,
        })),
      });
      // Remember phone for next visit
      localStorage.setItem(LAST_PHONE_KEY, values.customer_phone);
      clearCart();
      navigate(`/order/success/${data.order.order_number}`, { replace: true });
    } catch (err) {
      Toast.show({
        icon: 'fail',
        content: err.response?.data?.message || '下单失败，请重试',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="checkout-page">
        <NavBar onBack={() => navigate(-1)}>确认订单</NavBar>
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#969799' }}>
          购物车为空，请先选购商品
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <NavBar onBack={() => navigate(-1)}>确认订单</NavBar>

      <div className="checkout-delivery">
        <div className="checkout-section-title">配送信息</div>
        <div className="delivery-tag">{selectedDate}</div>
        <div className="delivery-tag">{selectedSlot?.slot_name} 配送</div>
      </div>

      <div className="checkout-items">
        <div className="checkout-section-title">订单商品</div>
        {items.map((item) => (
          <div key={`${item.product_id}_${item.product_name}`} className="checkout-item">
            <div className="co-item-main">
              <span className="co-item-name">
                {item.product_name}
                {item.is_custom && <span className="co-item-proxy-badge">代购</span>}
              </span>
              <span className="co-item-qty">x {item.quantity}</span>
              <span className="co-item-subtotal">{formatPrice(item.subtotal)}</span>
            </div>
            {item.remark && <div className="co-item-remark">{item.remark}</div>}
          </div>
        ))}
        <div className="checkout-total">
          合计：<span className="checkout-total-amount">{formatPrice(getTotal())}</span>
        </div>
      </div>

      <div className="checkout-form">
        <div className="checkout-section-title">顾客信息</div>
        <Form form={form} layout="vertical">
          <Form.Item
            name="customer_phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
            ]}
          >
            <Input placeholder="输入手机号自动查档" type="tel" clearable onBlur={handlePhoneBlur} />
          </Form.Item>
          <Form.Item name="customer_name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" clearable />
          </Form.Item>
          <Form.Item name="customer_address" label="配送地址" rules={[{ required: true, message: '请输入配送地址' }]}>
            <TextArea placeholder="请输入详细配送地址" rows={3} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea placeholder="如有特殊要求请填写（可选）" rows={2} />
          </Form.Item>
        </Form>
      </div>

      <div className="checkout-footer">
        <div className="checkout-footer-total">
          <span>合计：</span>
          <span className="total-amount">{formatPrice(getTotal())}</span>
        </div>
        <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '提交中...' : '提交订单'}
        </button>
      </div>
    </div>
  );
}
