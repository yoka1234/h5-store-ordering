import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, SwipeAction, Button, Toast } from 'antd-mobile';
import { adminGetProducts, adminToggleProduct, adminDeleteProduct } from '../../api/client';
import { formatPrice } from '../../utils/format';

export default function AdminProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  const fetchProducts = () => {
    adminGetProducts().then(setProducts);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleToggle = async (id) => {
    try {
      await adminToggleProduct(id);
      fetchProducts();
    } catch {
      Toast.show({ icon: 'fail', content: '操作失败' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminDeleteProduct(id);
      Toast.show({ icon: 'success', content: '已下架' });
      fetchProducts();
    } catch {
      Toast.show({ icon: 'fail', content: '操作失败' });
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #f5f5f5' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>商品管理</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="small" onClick={() => navigate('/admin/ai-manage')}>
            AI管理
          </Button>
          <Button size="small" color="primary" onClick={() => navigate('/admin/products/new')}>
            新增商品
          </Button>
        </div>
      </div>

      <List>
        {products.map((product) => (
          <SwipeAction
            key={product.id}
            rightActions={[
              {
                key: 'toggle',
                text: product.is_available ? '下架' : '上架',
                color: 'warning',
                onClick: () => handleToggle(product.id),
              },
              {
                key: 'delete',
                text: '删除',
                color: 'danger',
                onClick: () => handleDelete(product.id),
              },
            ]}
          >
            <List.Item
              prefix={
                <div style={{ width: 48, height: 48, borderRadius: 6, overflow: 'hidden', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#07c160' }}>
                  {product.image_url ? <img src={product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : product.name[0]}
                </div>
              }
              description={`${product.badge ? '【' + product.badge + '】' : ''}${formatPrice(product.price)}/${product.unit}  ·  ${product.category_name || ''}`}
              extra={
                <span style={{ fontSize: 12, color: product.is_available ? '#07c160' : '#999' }}>
                  {product.is_available ? '上架中' : '已下架'}
                </span>
              }
              onClick={() => navigate(`/admin/products/${product.id}/edit`)}
            >
              {product.name}
            </List.Item>
          </SwipeAction>
        ))}
      </List>
    </div>
  );
}
