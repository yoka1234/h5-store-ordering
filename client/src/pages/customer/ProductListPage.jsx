import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton, NavBar } from 'antd-mobile';
import useOrderStore from '../../store/orderStore';
import { getCategories, getProducts } from '../../api/client';
import CategoryTabs from '../../components/customer/CategoryTabs';
import ProductCard from '../../components/customer/ProductCard';
import CartFloatingButton from '../../components/customer/CartFloatingButton';
import './ProductListPage.css';

export default function ProductListPage() {
  const navigate = useNavigate();
  const selectedDate = useOrderStore((s) => s.selectedDate);
  const selectedSlot = useOrderStore((s) => s.selectedSlot);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedDate || !selectedSlot) {
      navigate('/', { replace: true });
      return;
    }

    Promise.all([getCategories(), getProducts()])
      .then(([cats, prods]) => {
        setCategories(cats);
        setProducts(prods);
      })
      .finally(() => setLoading(false));
  }, [selectedDate, selectedSlot, navigate]);

  const filteredProducts = activeCategory
    ? products.filter((p) => p.category_id === activeCategory)
    : products;

  const handleAddToCart = (product) => {
    // handled by ProductStepper inside ProductCard
  };

  return (
    <div className="product-list-page">
      <NavBar onBack={() => navigate('/')}>
        {selectedDate} {selectedSlot?.slot_name}
      </NavBar>

      {loading ? (
        <div style={{ padding: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton.Title key={i} animated style={{ marginBottom: 16 }} />
          ))}
        </div>
      ) : (
        <>
          <CategoryTabs categories={categories} activeId={activeCategory} onChange={setActiveCategory} />
          <div className="product-list">
            {filteredProducts.length === 0 ? (
              <div className="empty-tip">该分类暂无商品</div>
            ) : (
              filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
              ))
            )}
          </div>
        </>
      )}

      <CartFloatingButton />
    </div>
  );
}
