import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Toast, NavBar } from 'antd-mobile';
import { adminLogin } from '../../api/client';
import './LoginPage.css';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const data = await adminLogin(values.username, values.password);
      localStorage.setItem('admin_token', data.token);
      Toast.show({ icon: 'success', content: '登录成功' });
      navigate('/admin', { replace: true });
    } catch (err) {
      Toast.show({ icon: 'fail', content: err.response?.data?.message || '登录失败' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <NavBar onBack={() => navigate('/')}>陈记海鲜</NavBar>
      
      <div className="login-form-wrap">
        <div className="login-card">
          <div className="login-icon">🍤</div>
          <div className="login-title">陈记海鲜管理后台</div>
          <div className="login-subtitle">新鲜食材 · 健康配送</div>
          
          <Form
            onFinish={handleSubmit}
            layout="vertical"
            initialValues={{ username: 'admin', password: 'admin123' }}
            footer={
              <Button block type="submit" color="primary" size="large" loading={loading}>
                登录
              </Button>
            }
          >
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input placeholder="请输入用户名" clearable />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input placeholder="请输入密码" type="password" clearable />
            </Form.Item>
          </Form>
        </div>
      </div>

      <div className="login-plant-decoration" />
      <div className="login-plant-decoration-2" />
    </div>
  );
}
