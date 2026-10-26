const db = require('../db');

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

// Para el panel admin: últimas 500 ventas con el usuario del vendedor
async function findAll() {
  const [sales] = await db.execute(
    `SELECT s.id, s.transaction_code AS transaccion, s.created_at AS fecha,
      u.username AS vendedor, s.customer_name AS cliente, s.payment_method AS pago, s.total
     FROM sales s JOIN users u ON u.id = s.seller_id ORDER BY s.created_at DESC LIMIT 500`);
  return sales;
}

module.exports = { insert, insertItem, findAll };