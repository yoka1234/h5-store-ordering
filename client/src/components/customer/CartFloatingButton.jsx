import { useNavigate } from 'react-router-dom';
import useCartStore from '../../store/cartStore';
import { formatPrice } from '../../utils/format';
import './CartFloatingButton.css';

export default function CartFloatingButton() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  const handleClick = () => {
    if (count > 0) {
      navigate('/cart');
    }
  };

  return (
    <div className={`cart-float ${count > 0 ? 'visible' : ''}`} onClick={handleClick}>
      <div className="cart-float-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0020 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
        {count > 0 && <span className="cart-float-badge">{count}</span>}
      </div>
      <div className="cart-float-total">{formatPrice(total)}</div>
    </div>
  );
}
