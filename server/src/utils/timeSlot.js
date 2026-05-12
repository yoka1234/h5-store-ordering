const { getDb } = require('../database/connection');
const config = require('../config');

/**
 * Check if a time slot is available for a given delivery date.
 * For today: the slot is available only if current time < cutoff time.
 * For future dates: all slots are available.
 */
function isSlotAvailable(slot, targetDateStr) {
  const now = new Date();
  const targetDate = new Date(targetDateStr + 'T00:00:00');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Past dates are not available
  if (targetDate < today) {
    return { available: false, reason: '不支持历史日期下单' };
  }

  // Check max preorder days
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + config.MAX_PREORDER_DAYS);
  if (targetDate > maxDate) {
    return { available: false, reason: `仅支持${config.MAX_PREORDER_DAYS}天内预定` };
  }

  // For future dates (tomorrow and beyond), all slots are available
  if (targetDate.getTime() > today.getTime()) {
    return { available: true, reason: null };
  }

  // For today, check cutoff time
  const cutoffDateTime = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    slot.cutoff_hour,
    slot.cutoff_minute,
    0
  );

  if (now < cutoffDateTime) {
    return { available: true, reason: null };
  } else {
    return {
      available: false,
      reason: `已过下单截止时间 (${String(slot.cutoff_hour).padStart(2, '0')}:${String(slot.cutoff_minute).padStart(2, '0')})`,
    };
  }
}

/**
 * Get all available time slots for a given date.
 */
function getAvailableSlots(dateStr) {
  const db = getDb();
  const slots = db.prepare('SELECT * FROM time_slot_config WHERE is_active = 1 ORDER BY sort_order').all();

  return slots.map((slot) => ({
    id: slot.id,
    slot_name: slot.slot_name,
    cutoff_time: `${String(slot.cutoff_hour).padStart(2, '0')}:${String(slot.cutoff_minute).padStart(2, '0')}`,
    ...isSlotAvailable(slot, dateStr),
  }));
}

module.exports = { isSlotAvailable, getAvailableSlots };
