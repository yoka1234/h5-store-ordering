import { useEffect, useState } from 'react';
import { Skeleton } from 'antd-mobile';
import { getAvailableSlots } from '../../api/client';
import './TimeSlotSelector.css';

export default function TimeSlotSelector({ date, value, onChange }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    getAvailableSlots(date)
      .then((data) => setSlots(data.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [date]);

  if (!date) return null;
  if (loading) return <Skeleton.Title animated style={{ margin: '0 16px' }} />;

  return (
    <div className="slot-selector">
      <div className="slot-title">选择配送时段</div>
      <div className="slot-list">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={`slot-card ${!slot.available ? 'disabled' : ''} ${value?.id === slot.id ? 'active' : ''}`}
            onClick={() => slot.available && onChange(slot)}
          >
            <div className="slot-name">{slot.slot_name}</div>
            <div className="slot-cutoff">截单 {slot.cutoff_time}</div>
            {!slot.available && <div className="slot-reason">{slot.reason}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
