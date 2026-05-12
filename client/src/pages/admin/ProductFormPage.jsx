import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar, Form, Input, TextArea, Button, Toast, ImageUploader } from 'antd-mobile';
import { getProduct, adminCreateProduct, adminUpdateProduct, getCategories } from '../../api/client';

export default function AdminProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('price', values.price);
      formData.append('category_id', values.category_id || 1);
      formData.append('unit', values.unit || '斤');
      formData.append('description', values.description || '');
      formData.append('sort_order', values.sort_order || 0);
      formData.append('badge', values.badge || '');
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (isEdit) {
        await adminUpdateProduct(id, formData);
        Toast.show({ icon: 'success', content: '更新成功' });
      } else {
        await adminCreateProduct(formData);
        Toast.show({ icon: 'success', content: '创建成功' });
      }
      navigate(-1);
    } catch (err) {
      Toast.show({ icon: 'fail', content: err.response?.data?.message || '操作失败' });
    } finally {
      setLoading(false);
    }
  };

  const [initialValues, setInitialValues] = useState({
    name: '',
    price: '',
    unit: '斤',
    category_id: 1,
    description: '',
    sort_order: 0,
    badge: '',
  });

  useEffect(() => {
    if (isEdit) {
      getProduct(id).then((p) => {
        setInitialValues({
          name: p.name,
          price: String(p.price),
          unit: p.unit,
          category_id: p.category_id,
          description: p.description || '',
          sort_order: p.sort_order || 0,
          badge: p.badge || '',
        });
      });
    }
  }, [id, isEdit]);

  const BADGE_OPTIONS = [
    { value: '', label: '无标签' },
    { value: '今日特价', label: '今日特价' },
    { value: '推荐', label: '推荐' },
    { value: '新品', label: '新品' },
    { value: '热卖', label: '热卖' },
  ];

  return (
    <div style={{ minHeight: '100dvh', background: '#fff' }}>
      <NavBar onBack={() => navigate(-1)}>{isEdit ? '编辑商品' : '新增商品'}</NavBar>

      <div style={{ padding: 16 }}>
        <Form
          initialValues={initialValues}
          onFinish={handleSubmit}
          layout="vertical"
          key={JSON.stringify(initialValues)}
          footer={
            <Button block type="submit" color="primary" size="large" loading={loading}>
              {isEdit ? '保存修改' : '创建商品'}
            </Button>
          }
        >
          <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}>
            <Input placeholder="如：五花肉" clearable />
          </Form.Item>

          <Form.Item name="price" label="价格（元）" rules={[{ required: true, message: '请输入价格' }]}>
            <Input placeholder="如：28" type="number" clearable />
          </Form.Item>

          <Form.Item name="unit" label="单位" rules={[{ required: true }]}>
            <select className="ao-select" style={{ width: '100%', height: 40 }}>
              <option value="斤">斤</option>
              <option value="份">份</option>
              <option value="个">个</option>
              <option value="条">条</option>
              <option value="块">块</option>
              <option value="kg">kg</option>
              <option value="只">只</option>
            </select>
          </Form.Item>

          <Form.Item name="category_id" label="商品分类" rules={[{ required: true }]}>
            <select className="ao-select" style={{ width: '100%', height: 40 }}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Form.Item>

          <Form.Item name="description" label="商品描述">
            <TextArea placeholder="选填" rows={2} />
          </Form.Item>

          <Form.Item name="badge" label="商品标签">
            <select className="ao-select" style={{ width: '100%', height: 40 }}>
              {BADGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Form.Item>

          <Form.Item name="sort_order" label="排序">
            <Input placeholder="数字越小越靠前" type="number" />
          </Form.Item>

          <Form.Item label="商品图片">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              style={{ fontSize: 14 }}
            />
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
