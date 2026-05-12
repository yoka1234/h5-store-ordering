function generateOrderNumber(db, deliveryDate) {
  const datePrefix = deliveryDate.replace(/-/g, '');
  const row = db
    .prepare(
      'SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY order_number DESC LIMIT 1'
    )
    .get(`${datePrefix}%`);

  let sequence = 1;
  if (row) {
    const lastSeq = parseInt(row.order_number.slice(-3), 10);
    sequence = lastSeq + 1;
  }
  return `${datePrefix}${String(sequence).padStart(3, '0')}`;
}

module.exports = { generateOrderNumber };
