import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Request interceptor — attach token for admin routes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
    }
    return Promise.reject(err);
  }
);

export default api;

// Categories
export function getCategories() {
  return api.get('/categories').then((r) => r.data);
}

// Products
export function getProducts(params = {}) {
  return api.get('/products', { params }).then((r) => r.data);
}

export function getProduct(id) {
  return api.get(`/products/${id}`).then((r) => r.data);
}

// Time slots
export function getTimeSlots() {
  return api.get('/timeslots').then((r) => r.data);
}

export function getAvailableSlots(date) {
  return api.get('/timeslots/available', { params: { date } }).then((r) => r.data);
}

// Orders
export function createOrder(data) {
  return api.post('/orders', data).then((r) => r.data);
}

export function lookupOrder(orderNumber) {
  return api.get(`/orders/lookup/${orderNumber}`).then((r) => r.data);
}

export function listCustomerOrders(phone) {
  return api.get('/orders/customer', { params: { phone } }).then((r) => r.data);
}

// ======= Admin APIs =======
export function adminLogin(username, password) {
  return api.post('/admin/login', { username, password }).then((r) => r.data);
}

export function adminCheck() {
  return api.get('/admin/check').then((r) => r.data);
}

export function adminChangePassword(oldPassword, newPassword) {
  return api.post('/admin/change-password', { oldPassword, newPassword }).then((r) => r.data);
}

// Admin Products
export function adminGetProducts(params = {}) {
  return api.get('/products', { params: { ...params, _: Date.now() } }).then((r) => r.data);
}

export function adminCreateProduct(formData) {
  return api.post('/admin/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
}

export function adminUpdateProduct(id, formData) {
  return api.put(`/admin/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
}

export function adminDeleteProduct(id) {
  return api.delete(`/admin/products/${id}`).then((r) => r.data);
}

export function adminToggleProduct(id) {
  return api.put(`/admin/products/${id}/toggle`).then((r) => r.data);
}

// Admin Categories
export function adminGetCategories() {
  return api.get('/categories').then((r) => r.data);
}

export function adminCreateCategory(data) {
  return api.post('/admin/categories', data).then((r) => r.data);
}

export function adminUpdateCategory(id, data) {
  return api.put(`/admin/categories/${id}`, data).then((r) => r.data);
}

export function adminDeleteCategory(id) {
  return api.delete(`/admin/categories/${id}`).then((r) => r.data);
}

// Admin Orders
export function adminGetOrders(params = {}) {
  return api.get('/admin/orders', { params }).then((r) => r.data);
}

export function adminGetOrder(id) {
  return api.get(`/admin/orders/${id}`).then((r) => r.data);
}

export function adminUpdateOrderStatus(id, status) {
  return api.put(`/admin/orders/${id}/status`, { status }).then((r) => r.data);
}

export function adminGetDashboard() {
  return api.get('/admin/orders/dashboard').then((r) => r.data);
}

// Admin Time Slots
export function adminGetTimeSlots() {
  return api.get('/admin/timeslots').then((r) => r.data);
}

export function adminUpdateTimeSlot(id, data) {
  return api.put(`/admin/timeslots/${id}`, data).then((r) => r.data);
}

// Admin Update Order Items
export function adminUpdateOrderItems(orderId, items) {
  return api.put(`/admin/orders/${orderId}/items`, { items }).then((r) => r.data);
}

// Admin Payment
export function adminConfirmPayment(orderId) {
  return api.put(`/admin/orders/${orderId}/confirm-payment`).then((r) => r.data);
}

// Admin Delivery Photo
export function adminUploadDeliveryPhoto(orderId, formData) {
  return api.post(`/admin/orders/${orderId}/delivery-photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
}

// Admin Settings
export function adminGetSettings() {
  return api.get('/admin/settings').then((r) => r.data);
}

export function adminSaveSettings(data) {
  return api.put('/admin/settings', data).then((r) => r.data);
}

// Payment Info (public)
export function getPaymentInfo() {
  return api.get('/settings/payment').then((r) => r.data);
}

// Customer lookup (public)
export function lookupCustomer(phone) {
  return api.get('/customers/lookup', { params: { phone } }).then((r) => r.data);
}

// Upload payment QR code
export function adminUploadQrcode(formData) {
  return api.post('/admin/settings/upload-qrcode', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
}

// WeChat Pay
export function requestPayment(orderNumber) {
  return api.post('/pay/prepay', { orderNumber }).then((r) => r.data);
}

export function getPaymentStatus(orderNumber) {
  return api.get(`/pay/status/${orderNumber}`).then((r) => r.data);
}
