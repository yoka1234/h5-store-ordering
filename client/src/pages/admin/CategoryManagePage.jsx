import { useEffect, useState } from 'react';
import { List, Dialog, Button, Toast } from 'antd-mobile';
import { adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory } from '../../api/client';

export default function AdminCategoryManage() {
  const [categories, setCategories] = useState([]);

  const fetchCategories = () => {
    adminGetCategories().then(setCategories);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAdd = () => {
    Dialog.show({
      title: '新增分类',
      content: (
        <input
          id="new-cat-name"
          placeholder="分类名称"
          style={{ width: '100%', height: 36, border: '1px solid #ebedf0', borderRadius: 8, padding: '0 10px', fontSize: 14, marginTop: 8 }}
        />
      ),
      onConfirm: async () => {
        const input = document.getElementById('new-cat-name');
        const name = input?.value?.trim();
        if (!name) {
          Toast.show({ icon: 'fail', content: '名称不能为空' });
          return;
        }
        try {
          await adminCreateCategory({ name });
          Toast.show({ icon: 'success', content: '创建成功' });
          fetchCategories();
        } catch {
          Toast.show({ icon: 'fail', content: '创建失败' });
        }
      },
    });
  };

  const handleEdit = (cat) => {
    Dialog.show({
      title: '编辑分类',
      content: (
        <input
          id="edit-cat-name"
          defaultValue={cat.name}
          placeholder="分类名称"
          style={{ width: '100%', height: 36, border: '1px solid #ebedf0', borderRadius: 8, padding: '0 10px', fontSize: 14, marginTop: 8 }}
        />
      ),
      onConfirm: async () => {
        const input = document.getElementById('edit-cat-name');
        const name = input?.value?.trim();
        if (!name) {
          Toast.show({ icon: 'fail', content: '名称不能为空' });
          return;
        }
        try {
          await adminUpdateCategory(cat.id, { name });
          Toast.show({ icon: 'success', content: '更新成功' });
          fetchCategories();
        } catch {
          Toast.show({ icon: 'fail', content: '更新失败' });
        }
      },
    });
  };

  const handleDelete = (cat) => {
    Dialog.confirm({
      title: '确认删除',
      content: `确定删除分类「${cat.name}」？`,
      onConfirm: async () => {
        try {
          await adminDeleteCategory(cat.id);
          Toast.show({ icon: 'success', content: '删除成功' });
          fetchCategories();
        } catch (err) {
          Toast.show({ icon: 'fail', content: err.response?.data?.message || '删除失败' });
        }
      },
    });
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #f5f5f5' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>分类管理</h2>
        <Button size="small" color="primary" onClick={handleAdd}>
          新增分类
        </Button>
      </div>

      <List>
        {categories.map((cat) => (
          <List.Item
            key={cat.id}
            onClick={() => handleEdit(cat)}
            extra={
              <Button
                size="small"
                fill="none"
                style={{ color: '#ee0a24' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(cat);
                }}
              >
                删除
              </Button>
            }
          >
            {cat.name}
          </List.Item>
        ))}
      </List>
    </div>
  );
}
