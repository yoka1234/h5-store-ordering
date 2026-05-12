import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { TabBar } from 'antd-mobile';
import { AppOutline, UserOutline } from 'antd-mobile-icons';

export default function CustomerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { key: '/', title: '首页', icon: <AppOutline /> },
    { key: '/my', title: '我的', icon: <UserOutline /> },
  ];

  const activeKey = location.pathname === '/my' ? '/my' : '/';

  return (
    <div className="page" style={{ paddingBottom: 50, background: '#f5f5f5' }}>
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
