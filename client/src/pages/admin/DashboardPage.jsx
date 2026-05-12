import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Card, Skeleton } from 'antd-mobile';
import { adminGetDashboard } from '../../api/client';
import { formatPrice } from '../../utils/format';
import './DashboardPage.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetDashboard()
      .then((data) => setGroups(data.groups))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1 className="admin-title">商家后台</h1>
        <span className="admin-logout" onClick={handleLogout}>退出</span>
      </div>

      <div className="admin-quick-actions">
        <div className="quick-action" onClick={() => navigate('/admin/orders')}>
          <div className="qa-icon">📋</div>
          <div className="qa-label">订单管理</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/admin/products')}>
          <div className="qa-icon">🥬</div>
          <div className="qa-label">商品管理</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/admin/categories')}>
          <div className="qa-icon">📁</div>
          <div className="qa-label">分类管理</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/admin/settings')}>
          <div className="qa-icon">⚙️</div>
          <div className="qa-label">时段设置</div>
        </div>
        <div className="quick-action" onClick={() => navigate('/admin/ai-manage')}>
          <div className="qa-icon">🤖</div>
          <div className="qa-label">AI管理</div>
        </div>
      </div>

      <div className="admin-section-title">订单概览</div>

      {loading ? (
        <div style={{ padding: '0 16px' }}>
          {[1, 2, 3].map((i) => <Skeleton.Title key={i} animated style={{ marginBottom: 12 }} />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="dashboard-empty">暂无订单</div>
      ) : (
        groups.map((g, idx) => (
          <Card
            key={`${g.delivery_date}-${g.time_slot_id}`}
            className="dashboard-card"
            onClick={() => navigate(`/admin/orders?date=${g.delivery_date}&time_slot_id=${g.time_slot_id}`)}
          >
            <div className="dc-header">
              <span className="dc-date">{g.delivery_date}</span>
              <span className="dc-slot">{g.slot_name}</span>
            </div>
            <div className="dc-stats">
              <div className="dc-stat">
                <div className="dc-stat-val">{g.order_count}</div>
                <div className="dc-stat-label">总订单</div>
              </div>
              <div className="dc-stat">
                <div className="dc-stat-val" style={{ color: '#ff976a' }}>{g.pending_count}</div>
                <div className="dc-stat-label">待确认</div>
              </div>
              <div className="dc-stat">
                <div className="dc-stat-val" style={{ color: '#07c160' }}>{g.confirmed_count}</div>
                <div className="dc-stat-label">已确认</div>
              </div>
              <div className="dc-stat">
                <div className="dc-stat-val" style={{ color: '#1989fa' }}>{g.completed_count}</div>
                <div className="dc-stat-label">已完成</div>
              </div>
            </div>
            <div className="dc-total">
              合计：<span className="dc-total-amount">{formatPrice(g.total_amount)}</span>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
