import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Tabs, Skeleton, Badge } from 'antd-mobile';
import { adminGetOrders, adminGetTimeSlots } from '../../api/client';
import { formatPrice, ORDER_STATUS_MAP } from '../../utils/format';
import dayjs from 'dayjs';
import './OrderManagePage.css';

export default function AdminOrderManage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(searchParams.get('date') || dayjs().format('YYYY-MM-DD'));
  const [slotId, setSlotId] = useState(searchParams.get('time_slot_id') || '');
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    adminGetTimeSlots().then(setSlots);
  }, []);

  useEffect(() => {
    setLoading(true);
    adminGetOrders({ date, time_slot_id: slotId || undefined })
      .then((data) => setOrders(data.orders))
      .finally(() => setLoading(false));
  }, [date, slotId]);

  // Generate date options
  const weekDays = ['日','一','二','三','四','五','六'];
  const dates = [];
  for (let i = -1; i < 7; i++) {
    const d = dayjs().add(i, 'day');
    const dateStr = d.format('M/D');
    if (i === -1) dates.push({ value: d.format('YYYY-MM-DD'), label: '昨天 ' + dateStr });
    else if (i === 0) dates.push({ value: d.format('YYYY-MM-DD'), label: '今天 ' + dateStr });
    else if (i === 1) dates.push({ value: d.format('YYYY-MM-DD'), label: '明天 ' + dateStr });
    else dates.push({ value: d.format('YYYY-MM-DD'), label: dateStr + ' 周' + weekDays[d.day()] });
  }

  return (
    <div className="admin-orders">
      <div className="ao-filters">
        <select className="ao-select" value={date} onChange={(e) => setDate(e.target.value)}>
          {dates.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <select className="ao-select" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
          <option value="">全部时段</option>
          {slots.map((s) => (
            <option key={s.id} value={s.id}>{s.slot_name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 16 }}>
          {[1, 2, 3, 4].map((i) => <Skeleton.Title key={i} animated style={{ marginBottom: 12 }} />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="ao-empty">该日期暂无订单</div>
      ) : (
        <div className="ao-list">
          {orders.map((order) => {
            const statusInfo = ORDER_STATUS_MAP[order.status];
            return (
              <Card
                key={order.id}
                className="ao-card"
                onClick={() => navigate(`/admin/orders/${order.id}`)}
              >
                <div className="ao-card-header">
                  <span className="ao-number">{order.order_number}</span>
                  <div className="ao-badges">
                    {order.paid_at && (
                      <span className="ao-paid-badge">
                        {order.payment_method === 'wechat' ? '微信已付' : '已收款'}
                      </span>
                    )}
                    <span className="ao-status" style={{ color: statusInfo.color }}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
                <div className="ao-card-body">
                  <div className="ao-customer">
                    {order.customer_name} · {order.customer_phone}
                  </div>
                  <div className="ao-address">{order.customer_address}</div>
                </div>
                <div className="ao-card-footer">
                  <span className="ao-slot-tag">{order.slot_name}</span>
                  <span className="ao-amount">{formatPrice(order.total_amount)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
