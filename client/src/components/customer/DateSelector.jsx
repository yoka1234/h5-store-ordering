import { useMemo } from 'react';
import dayjs from 'dayjs';
import { getDateLabel } from '../../utils/format';
import './DateSelector.css';

export default function DateSelector({ value, onChange }) {
  const dates = useMemo(() => {
    const result = [];
    for (let i = 0; i < 7; i++) {
      const d = dayjs().add(i, 'day');
      result.push({
        value: d.format('YYYY-MM-DD'),
        label: getDateLabel(d.format('YYYY-MM-DD')),
        date: d.format('M/D'),
      });
    }
    return result;
  }, []);

  return (
    <div className="date-selector">
      {dates.map((d) => (
        <div
          key={d.value}
          className={`date-item ${value === d.value ? 'active' : ''}`}
          onClick={() => onChange(d.value)}
        >
          <div className="date-label">{d.label}</div>
          <div className="date-date">{d.date}</div>
        </div>
      ))}
    </div>
  );
}
