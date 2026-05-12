import { useState, useRef, useEffect } from 'react';
import useCartStore from '../../store/cartStore';
import api from '../../api/client';
import './AIChat.css';

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const items = useCartStore((s) => s.items);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSend = async () => {
    if (!message.trim() || loading) return;
    const msg = message.trim();
    setMessage('');
    setChatLog((prev) => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: msg });
      const data = res.data;

      // Add matched items to cart
      if (data.items?.length > 0) {
        for (const item of data.items) {
          const existing = items.find((i) => i.product_id === item.product_id);
          if (existing) {
            updateQuantity(item.product_id, existing.quantity + item.quantity);
          } else {
            addItem({
              id: item.product_id,
              name: item.product_name,
              price: item.price,
              unit: item.unit,
            });
            if (item.quantity > 1) {
              setTimeout(() => updateQuantity(item.product_id, item.quantity), 100);
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
    <>
      {/* Floating button */}
      {!open && (
        <button className="ai-chat-fab" onClick={() => setOpen(true)}>
          <span className="ai-chat-fab-icon">AI</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="ai-chat-panel">
          <div className="ai-chat-header">
            <span className="ai-chat-header-title">AI 导购</span>
            <span className="ai-chat-header-sub">告诉我您想买什么</span>
            <button className="ai-chat-close" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="ai-chat-body">
            {chatLog.length === 0 && (
              <div className="ai-chat-hint">
                <p>试试这样说：</p>
                <button className="ai-hint-btn" onClick={() => setMessage('我要2斤沙虫和1条鲈鱼')}>我要2斤沙虫和1条鲈鱼</button>
                <button className="ai-hint-btn" onClick={() => setMessage('帮我配一桌海鲜，500元以内')}>帮我配一桌海鲜，500元以内</button>
                <button className="ai-hint-btn" onClick={() => setMessage('推荐今天的特价海鲜')}>推荐今天的特价海鲜</button>
              </div>
            )}

            {chatLog.map((entry, idx) => (
              <div key={idx} className={`ai-msg ${entry.role}`}>
                <div className="ai-msg-bubble">{entry.text}</div>
                {entry.items?.length > 0 && (
                  <div className="ai-msg-items">
                    {entry.items.map((item, i) => (
                      <span key={i} className="ai-item-tag">
                        {item.product_name} x{item.quantity}{item.unit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="ai-msg assistant">
                <div className="ai-msg-bubble ai-typing">...</div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="ai-chat-input-row">
            <input
              ref={inputRef}
              className="ai-chat-input"
              placeholder="说您想要的..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="ai-chat-send" disabled={loading || !message.trim()} onClick={handleSend}>
              发送
            </button>
          </div>
        </div>
      )}
    </>
  );
}
