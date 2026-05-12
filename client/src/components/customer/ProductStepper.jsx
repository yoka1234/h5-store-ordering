import { useState } from 'react';
import useCartStore from '../../store/cartStore';
import './ProductStepper.css';

const REMARK_OPTIONS = [
  '处理干净',
  '切块',
  '切片',
  '去皮',
  '去骨',
];

export default function ProductStepper({ product }) {
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState([]);
  const [customRemark, setCustomRemark] = useState('');

  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const updateRemark = useCartStore((s) => s.updateRemark);

  const item = items.find((i) => i.product_id === product.id);
  const qty = item ? item.quantity : 0;

  const toggleRemarkOption = (option) => {
    setSelectedRemarks(prev => 
      prev.includes(option) 
        ? prev.filter(r => r !== option)
        : [...prev, option]
    );
  };

  const handleAddItem = () => {
    const existingRemark = item?.remark || '';
    setCustomRemark(existingRemark.split('、').find(r => !REMARK_OPTIONS.includes(r)) || '');
    setSelectedRemarks(existingRemark ? existingRemark.split('、').filter(r => REMARK_OPTIONS.includes(r)) : []);
    setShowRemarkModal(true);
  };

  const handleConfirm = () => {
    let remark = [...selectedRemarks];
    if (customRemark && !remark.includes(customRemark)) {
      remark.push(customRemark);
    }
    const finalRemark = remark.join('、');
    
    if (qty === 0) {
      addItem(product);
      setTimeout(() => {
        updateRemark(product.id, finalRemark);
      }, 0);
    } else {
      updateQuantity(product.id, parseFloat((qty + 1).toFixed(1)));
      updateRemark(product.id, finalRemark);
    }
    
    setShowRemarkModal(false);
    setCustomRemark('');
    setSelectedRemarks([]);
  };

  const handleCancel = () => {
    setShowRemarkModal(false);
    setCustomRemark('');
    setSelectedRemarks([]);
  };

  return (
    <>
      <div className="stepper">
        {qty > 0 && (
          <>
            <button className="stepper-btn" onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, parseFloat((qty - 1).toFixed(1))); }}>
              -
            </button>
            <span className="stepper-qty">{qty}</span>
          </>
        )}
        <button className="stepper-btn stepper-plus" onClick={(e) => { e.stopPropagation(); handleAddItem(); }}>
          +
        </button>
      </div>

      {showRemarkModal && (
        <div className="remark-modal-overlay" onClick={handleCancel}>
          <div className="remark-modal" onClick={(e) => e.stopPropagation()}>
            <div className="remark-modal-header">
              <h3 className="remark-modal-title">添加备注</h3>
              <button className="remark-modal-close" onClick={handleCancel}>×</button>
            </div>
            <div className="remark-modal-content">
              <p className="remark-modal-label">选择处理要求（可选）</p>
              <div className="remark-options">
                {REMARK_OPTIONS.map((option) => (
                  <button
                    key={option}
                    className={`remark-option ${selectedRemarks.includes(option) ? 'selected' : ''}`}
                    onClick={() => toggleRemarkOption(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="remark-input-wrap">
                <input
                  type="text"
                  placeholder="其他备注（选填）"
                  value={customRemark}
                  onChange={(e) => setCustomRemark(e.target.value)}
                  className="remark-input"
                />
              </div>
            </div>
            <div className="remark-modal-footer">
              <button className="remark-modal-btn cancel-btn" onClick={handleCancel}>取消</button>
              <button className="remark-modal-btn confirm-btn" onClick={handleConfirm}>确认</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
