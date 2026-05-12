import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { adminCheck } from './api/client';
import CustomerLayout from './components/customer/CustomerLayout';
import AdminLayout from './components/admin/AdminLayout';
import HomePage from './pages/customer/HomePage';
import ProductListPage from './pages/customer/ProductListPage';
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrderConfirmPage from './pages/customer/OrderConfirmPage';
import OrderLookupPage from './pages/customer/OrderLookupPage';
import MyPage from './pages/customer/MyPage';
import AIShopPage from './pages/customer/AIShopPage';
import AdminLoginPage from './pages/admin/LoginPage';
import AdminDashboard from './pages/admin/DashboardPage';
import AdminOrderManage from './pages/admin/OrderManagePage';
import AdminOrderDetail from './pages/admin/OrderDetailPage';
import AdminProductList from './pages/admin/ProductListPage';
import AdminProductForm from './pages/admin/ProductFormPage';
import AdminCategoryManage from './pages/admin/CategoryManagePage';
import AdminSettingsPage from './pages/admin/SettingsPage';
import AIManagePage from './pages/admin/AIManagePage';

function AdminGuard({ children }) {
  const [authed, setAuthed] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setAuthed(false);
    } else {
      adminCheck()
        .then(() => setAuthed(true))
        .catch(() => setAuthed(false));
    }
  }, []);

  if (authed === null) return null;
  if (!authed) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer routes with tab bar */}
        <Route element={<CustomerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/my" element={<MyPage />} />
        </Route>

        {/* Customer shopping flow (no tab bar, own NavBar back) */}
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order/success/:orderNumber" element={<OrderConfirmPage />} />
        <Route path="/order/lookup" element={<OrderLookupPage />} />
        <Route path="/ai-shop" element={<AIShopPage />} />

        {/* Admin login */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrderManage />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="products" element={<AdminProductList />} />
          <Route path="products/new" element={<AdminProductForm />} />
          <Route path="products/:id/edit" element={<AdminProductForm />} />
          <Route path="categories" element={<AdminCategoryManage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="ai-manage" element={<AIManagePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
