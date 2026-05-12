import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import useOrderStore from '../../store/orderStore';
import useCartStore from '../../store/cartStore';
import DateSelector from '../../components/customer/DateSelector';
import TimeSlotSelector from '../../components/customer/TimeSlotSelector';
import dayjs from 'dayjs';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const selectedDate = useOrderStore((s) => s.selectedDate);
  const selectedSlot = useOrderStore((s) => s.selectedSlot);
  const setSelectedDate = useOrderStore((s) => s.setSelectedDate);
  const setSelectedSlot = useOrderStore((s) => s.setSelectedSlot);
  const clearCart = useCartStore((s) => s.clearCart);

  // Default to today
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(dayjs().format('YYYY-MM-DD'));
    }
  }, [selectedDate, setSelectedDate]);

  const handleDateChange = (date) => {
    if (date !== selectedDate) {
      clearCart();
      setSelectedDate(date);
      setSelectedSlot(null);
    }
  };

  const handleSlotChange = (slot) => {
    if (selectedSlot?.id !== slot.id) {
      clearCart();
      setSelectedSlot(slot);
    }
  };

  const handleGoShopping = () => {
    if (selectedDate && selectedSlot) {
      navigate('/products');
    }
  };

  return (
    <div className="home-page">
      <div className="home-header">
        <div className="home-header-img" />
        <h1 className="home-title">陈记海鲜</h1>
        <p className="home-subtitle">新鲜食材 · 健康美味 · 当日配送</p>
      </div>

      <div className="home-section">
        <div className="section-label">🌿 选择配送日期</div>
        <DateSelector value={selectedDate} onChange={handleDateChange} />
      </div>

      <div className="home-section">
        <div className="section-label">⏰ 选择配送时段</div>
        <TimeSlotSelector date={selectedDate} value={selectedSlot} onChange={handleSlotChange} />
      </div>

      {selectedDate && selectedSlot && (
        <div className="home-confirm">
          <div className="confirm-info">
            您选择了 <strong>{selectedDate}</strong> <strong>{selectedSlot.slot_name}</strong> 配送
          </div>
          <div className="home-entry-cards">
            <div className="home-entry-card" onClick={handleGoShopping}>
              <div className="hmec-icon">🥬</div>
              <div className="hmec-title">手动选购</div>
              <div className="hmec-desc">按分类浏览新鲜食材</div>
            </div>
            <div className="home-entry-card ai-entry" onClick={() => navigate('/ai-shop')}>
              <div className="hmec-icon">🤖</div>
              <div className="hmec-title">AI 智能选购</div>
              <div className="hmec-desc">说出想要的，AI帮您配</div>
            </div>
          </div>
        </div>
      )}

      <div className="health-decoration" />
      <div className="health-decoration-2" />
    </div>
  );
}
