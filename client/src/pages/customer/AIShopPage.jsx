import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from 'antd-mobile';
import useCartStore from '../../store/cartStore';
import useOrderStore from '../../store/orderStore';
import CartFloatingButton from '../../components/customer/CartFloatingButton';
import api from '../../api/client';
import './AIShopPage.css';

export default function AIShopPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const items = useCartStore((s) => s.items);
  const selectedDate = useOrderStore((s) => s.selectedDate);
  const selectedSlot = useOrderStore((s) => s.selectedSlot);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!message.trim() || loading) return;
    const msg = message.trim();
    setMessage('');
    setChatLog((prev) => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: msg });
      const data = res.data;

      if (data.items?.length > 0) {
        for (const item of data.items) {
          const matchKey = item.is_custom ? `custom_${item.product_name}` : item.product_id;
          const existing = items.find((i) => {
            if (item.is_custom) return i.is_custom && i.product_name === item.product_name;
            return i.product_id === item.product_id;
          });
          if (existing) {
            updateQuantity(existing.product_id, existing.quantity + item.quantity);
          } else {
            addItem({
              id: item.is_custom ? 0 : item.product_id,
              name: item.product_name,
              price: item.price,
              unit: item.unit || '份',
              is_custom: item.is_custom || false,
            });
            // For custom items, use a generated key to find the cart entry
            if (item.quantity > 1 || item.is_custom) {
              setTimeout(() => {
                const cartItems = useCartStore.getState().items;
                const target = item.is_custom
                  ? cartItems.find((i) => i.is_custom && i.product_name === item.product_name)
                  : cartItems.find((i) => i.product_id === item.product_id);
                if (target) {
                  updateQuantity(target.product_id, item.quantity);
                }
              }, 150);
            }
          }
        }
      }

      setChatLog((prev) => [...prev, { role: 'assistant', text: data.reply || '已处理', items: data.items }]);
    } catch {
      setChatLog((prev) => [...prev, { role: 'assistant', text: '抱歉，出了点问题，请稍后再试。' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-shop-page">
      <NavBar onBack={() => navigate(-1)}>
        AI 智能选购 · {selectedSlot?.slot_name}
      </NavBar>

      <div className="ai-shop-body">
        {chatLog.length === 0 && (
          <div className="ai-shop-welcome">
            <div className="aisw-icon">&#129302;</div>
            <div className="aisw-title">AI 智能导购</div>
            <div className="aisw-sub">告诉我您想买什么，我来帮您配齐</div>
            <div className="aisw-hints">
              <p>您可以这样说：</p>
              <button className="aisw-hint" onClick={() => setMessage('我要2斤沙虫和1条鲈鱼')}>我要2斤沙虫和1条鲈鱼</button>
              <button className="aisw-hint" onClick={() => setMessage('5只鲍鱼10头的，3斤花甲，2条石斑鱼')}>5只鲍鱼10头的，3斤花甲，2条石斑鱼</button>
              <button className="aisw-hint" onClick={() => setMessage('帮我推荐4人份海鲜火锅食材，300元预算')}>帮我推荐4人份海鲜火锅食材，300元预算</button>
              <button className="aisw-hint" onClick={() => setMessage('推荐今天最新鲜的海鲜有哪些')}>推荐今天最新鲜的海鲜有哪些</button>
            </div>
          </div>
        )}

        {chatLog.map((entry, idx) => (
          <div key={idx} className={`ais-msg ${entry.role}`}>
            <div className="ais-msg-bubble">{entry.text}</div>
            {entry.items?.length > 0 && (
              <div className="ais-msg-items">
                {entry.items.map((item, i) => (
                  <span key={i} className="ais-item-tag">
                    {item.product_name} x{item.quantity}{item.unit}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="ais-msg assistant">
            <div className="ais-msg-bubble ais-typing">思考中...</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="ai-shop-input-row">
        <input
          ref={inputRef}
          className="ai-shop-input"
          placeholder="说您想要的食材..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="ai-shop-send" disabled={loading || !message.trim()} onClick={handleSend}>
          发送
        </button>
      </div>

      <CartFloatingButton />
    </div>
  );
}
