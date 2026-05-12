import { useState } from 'react';
import { NavBar, Input, Button, Toast, SpinLoading, Ellipsis } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function AIManagePage() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg) return;
    setInput('');
    setLoading(true);

    const userMsg = { role: 'user', text: msg };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.post('/ai/admin', { message: msg });
      const data = res.data;
      const reply = data.reply || '操作完成';
      const opsText = data.operations?.length
        ? data.operations.map((o) => `${o.success ? '✓' : '✗'} ${o.product_name}: ${o.action}`).join('\n')
        : '';
      setMessages((prev) => [...prev, { role: 'assistant', text: reply, ops: opsText }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: err.response?.data?.error || '服务不可用，请稍后重试', ops: '' }]);
    } finally {
      setLoading(false);
    }
  };

  const EXAMPLES = [
    '把东星斑和大蓝花蟹设为今日特价',
    '把所有虾类标记为推荐',
    '把小青龙价格改为58元',
    '下架所有预售商品',
    '清除生蚝的标签',
  ];

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>AI 商品管理</NavBar>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {messages.length === 0 && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>试试这些指令：</div>
            {EXAMPLES.map((e, i) => (
              <div
                key={i}
                onClick={() => setInput(e)}
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  margin: '0 8px 8px 0',
                  background: '#fff',
                  borderRadius: 16,
                  fontSize: 13,
                  color: '#333',
                  cursor: 'pointer',
                  border: '1px solid #eee',
                }}
              >
                {e}
              </div>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16, display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div
              style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: 12,
                background: m.role === 'user' ? '#1677ff' : '#fff',
                color: m.role === 'user' ? '#fff' : '#333',
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              <div>{m.text}</div>
              {m.ops && (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid #eee',
                    fontSize: 12,
                    color: '#666',
                  }}
                >
                  {m.ops}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <SpinLoading style={{ '--size': '24px' }} />
            <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>AI 正在分析指令...</div>
          </div>
        )}
      </div>

      <div
        style={{
          padding: '10px 16px',
          background: '#fff',
          borderTop: '1px solid #eee',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <Input
          value={input}
          onChange={setInput}
          placeholder="输入商品管理指令，如：把大花蟹设为推荐"
          onEnterPress={handleSend}
          style={{ flex: 1, '--font-size': '14px' }}
        />
        <Button color="primary" size="small" onClick={handleSend} loading={loading} disabled={!input.trim()}>
          发送
        </Button>
      </div>
    </div>
  );
}
