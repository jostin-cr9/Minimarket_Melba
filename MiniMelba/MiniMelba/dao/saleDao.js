async function insert(conn, { transactionCode, sellerId, customerName, paymentMethod, total }) {
  const [result] = await conn.execute(
    'INSERT INTO sales (transaction_code, seller_id, customer_name, payment_method, total) VALUES (?, ?, ?, ?, ?)',
    [transactionCode, sellerId, customerName, paymentMethod, total]);
  return result.insertId;
}

async function insertItem(conn, { saleId, productId, productName, quantity, unitPrice }) {
  await conn.execute(
    'INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
    [saleId, productId, productName, quantity, unitPrice]);
}

module.exports = { insert, insertItem };