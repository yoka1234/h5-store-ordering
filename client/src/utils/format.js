import dayjs from 'dayjs';

export function formatPrice(price) {
  return `¥${price.toFixed(2)}`;
}

export function formatDate(dateStr) {
  return dayjs(dateStr).format('M月D日');
}

export function formatDateFull(dateStr) {
  return dayjs(dateStr).format('YYYY年M月D日');
}

export function getDateLabel(dateStr) {
  const d = dayjs(dateStr);
  const today = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

  if (dateStr === today) return '今天';
  if (dateStr === tomorrow) return '明天';
  return `周${['日', '一', '二', '三', '四', '五', '六'][d.day()]}`;
}

export const ORDER_STATUS_MAP = {
  pending: { label: '待确认', color: '#ff976a' },
  confirmed: { label: '已确认', color: '#07c160' },
  delivering: { label: '配送中', color: '#1989fa' },
  completed: { label: '已完成', color: '#07c160' },
  cancelled: { label: '已取消', color: '#969799' },
};
