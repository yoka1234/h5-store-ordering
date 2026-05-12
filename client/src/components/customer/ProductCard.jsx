import { formatPrice } from '../../utils/format';
import ProductStepper from './ProductStepper';
import './ProductCard.css';

export default function ProductCard({ product, onAddToCart }) {
  return (
    <div className="product-card" onClick={() => onAddToCart && onAddToCart(product)}>
      <div className="product-img-wrap">
        {product.badge && (
          <span className="product-preorder-badge" style={{ background: '#e74c3c' }}>{product.badge}</span>
        )}
        {!product.badge && product.is_preorder === 1 && (
          <span className="product-preorder-badge">预订</span>
        )}
        {product.image_url ? (
          <img className="product-img" src={product.image_url} alt={product.name} />
        ) : (
          <div className="product-img-placeholder">{product.name[0]}</div>
        )}
      </div>
      <div className="product-info">
        <div className="product-name">{product.name}</div>
        <div className="product-price">
          <span className="price-num">{formatPrice(product.price)}</span>
          <span className="price-unit">/{product.unit}</span>
        </div>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <ProductStepper product={product} />
      </div>
    </div>
  );
}
