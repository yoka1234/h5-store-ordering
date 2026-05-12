import { useNavigate } from 'react-router-dom';
import { NavBar, Empty } from 'antd-mobile';
import useCartStore from '../../store/cartStore';
import useOrderStore from '../../store/orderStore';
import { formatPrice } from '../../utils/format';
import './CartPage.css';

export default function CartPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const updateRemark = useCartStore((s) => s.updateRemark);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const getTotal = useCartStore((s) => s.getTotal);
  const selectedDate = useOrderStore((s) => s.selectedDate);
  const selectedSlot = useOrderStore((s) => s.selectedSlot);

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <NavBar onBack={() => navigate(-1)}>购物车</NavBar>
        <Empty description="购物车是空的" style={{ marginTop: '40%' }} />
        <div className="cart-empty-action">
          <button className="go-shop-btn" onClick={() => navigate('/products')}>去选购</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <NavBar onBack={() => navigate(-1)}>购物车</NavBar>

      <div className="cart-delivery-info">
        <span>{selectedDate}</span>
        <span>{selectedSlot?.slot_name} 配送</span>
      </div>

      <div className="cart-items">
        {items.map((item) => (
          <div key={`${item.product_id}_${item.product_name}`} className="cart-item">
            <div className="cart-item-img-wrap">
              {item.image_url ? (
                <img className="cart-item-img" src={item.image_url} alt={item.product_name} />
              ) : (
                <div className="cart-item-img-placeholder">{item.product_name[0]}</div>
              )}
            </div>
            <div className="cart-item-info">
              <div className="cart-item-name">
                {item.product_name}
                {item.is_custom && <span className="cart-item-proxy-badge">代购</span>}
              </div>
              <div className="cart-item-price">
                {formatPrice(item.price)}/{item.unit}
              </div>
              <input
                className="cart-item-remark"
                placeholder="备注（选填）"
                value={item.remark || ''}
                onChange={(e) => updateRemark(item.product_id, e.target.value)}
              />
            </div>
            <div className="cart-item-controls">
              <button
                className="ctrl-btn"
                onClick={() => updateQuantity(item.product_id, parseFloat((item.quantity - 1).toFixed(1)))}
              >
                -
              </button>
              <span className="ctrl-qty">{item.quantity}</span>
              <button
                className="ctrl-btn ctrl-plus"
                onClick={() => updateQuantity(item.product_id, parseFloat((item.quantity + 1).toFixed(1)))}
              >
                +
              </button>
            </div>
            <div className="cart-item-subtotal">{formatPrice(item.subtotal)}</div>
            <button className="cart-item-del" onClick={() => removeItem(item.product_id)}>×</button>
          </div>
        ))}
      </div>

      <div className="cart-actions">
        <button className="cart-clear" onClick={clearCart}>清空</button>
      </div>

      <div className="cart-footer">
        <div className="cart-footer-total">
          <span>合计：</span>
          <span className="total-amount">{formatPrice(getTotal())}</span>
        </div>
        <button className="checkout-btn" onClick={() => navigate('/checkout')}>
          去结算
        </button>
      </div>
    </div>
  );
}
