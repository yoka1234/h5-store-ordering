import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { TabBar } from 'antd-mobile';
import { AppOutline, UnorderedListOutline, UserOutline } from 'antd-mobile-icons';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { key: '/admin', title: '仪表盘', icon: <AppOutline /> },
    { key: '/admin/orders', title: '订单', icon: <UnorderedListOutline /> },
    { key: '/admin/products', title: '商品', icon: <UserOutline /> },
  ];

  const activeKey = tabs.find((t) => location.pathname.startsWith(t.key) && t.key !== '/admin')
    ? tabs.find((t) => location.pathname.startsWith(t.key) && t.key !== '/admin').key
    : location.pathname === '/admin'
      ? '/admin'
      : tabs.find((t) => location.pathname.startsWith(t.key))?.key || '/admin';

  return (
    <div className="page" style={{ paddingBottom: 50 }}>
      <Outlet />
      <TabBar
        activeKey={activeKey}
        onChange={(key) => navigate(key)}
        style={{ position: 'fixed', bottom: 0, width: '100%', background: '#fff', borderTop: '1px solid #ebedf0' }}
      >
        {tabs.map((tab) => (
          <TabBar.Item key={tab.key} icon={tab.icon} title={tab.title} />
        ))}
      </TabBar>
    </div>
  );
}
