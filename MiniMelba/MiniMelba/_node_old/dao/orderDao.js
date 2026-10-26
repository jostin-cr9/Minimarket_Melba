const crypto = require('node:crypto');
const db = require('../db');

async function attachItems(orders) {
  if (!orders.length) return orders;
  const [items] = await db.query(
    'SELECT order_id AS orderId, product_id AS productId, product_name AS name, unit, quantity, unit_price AS price FROM order_items WHERE order_id IN (?)',
    [orders.map(o => o.id)]
  );
  const byOrder = new Map();
  for (const item of items) {
    if (!byOrder.has(item.orderId)) byOrder.set(item.orderId, []);
    byOrder.get(item.orderId).push(item);
  }
  return orders.map(o => ({ ...o, items: byOrder.get(o.id) || [] }));
}

// Crea el pedido y le asigna su código 
async function insert(conn, { buyerId, customerName, delivery, address, paymentMethod, total }) {
  const [result] = await conn.execute(
    'INSERT INTO orders (order_code, buyer_id, customer_name, delivery_type, address, payment_method, total) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [crypto.randomUUID(), buyerId, customerName, delivery, address, paymentMethod, total]);
  await conn.execute("UPDATE orders SET order_code = CONCAT('PED-', LPAD(id, 4, '0')) WHERE id = ?", [result.insertId]);
  return result.insertId;
}

async function insertItem(conn, { orderId, productId, productName, unit, quantity, unitPrice }) {
  await conn.execute(
    'INSERT INTO order_items (order_id, product_id, product_name, unit, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)',
    [orderId, productId, productName, unit, quantity, unitPrice]);
}

// buyerId: solo los pedidos de ese comprador. status: solo ese estado.
async function findAll({ buyerId, status } = {}) {
  const conditions = [];
  const params = [];
  if (buyerId) { conditions.push('buyer_id = ?'); params.push(buyerId); }
  if (status) { conditions.push('status = ?'); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [orders] = await db.execute(
    `SELECT id, order_code AS code, customer_name AS customer, delivery_type AS delivery, address, payment_method AS payment, total, status, created_at AS createdAt
     FROM orders ${where} ORDER BY created_at DESC LIMIT 200`, params);
  return attachItems(orders);
}

async function findByIdForUpdate(conn, id) {
  const [rows] = await conn.execute(
    'SELECT id, order_code, customer_name, payment_method, total, status FROM orders WHERE id=? FOR UPDATE', [id]);
  return rows[0];
}

async function findItems(conn, orderId) {
  const [rows] = await conn.execute(
    'SELECT product_id, product_name, quantity, unit_price FROM order_items WHERE order_id=?', [orderId]);
  return rows;
}

async function updateStatus(conn, { id, status, sellerId, saleId }) {
  await conn.execute(
    'UPDATE orders SET status=?, seller_id=?, sale_id=COALESCE(?, sale_id) WHERE id=?', [status, sellerId, saleId, id]);
}

// Un solo UPDATE condicionado: solo cambia si es de ese comprador y sigue pendiente
async function cancelPending(id, buyerId) {
  const [result] = await db.execute(
    "UPDATE orders SET status = 'cancelado' WHERE id = ? AND buyer_id = ? AND status = 'pendiente'", [id, buyerId]);
  return result.affectedRows === 1;
}

async function findStatusByBuyer(id, buyerId) {
  const [rows] = await db.execute('SELECT status FROM orders WHERE id = ? AND buyer_id = ?', [id, buyerId]);
  return rows[0]?.status;
}

module.exports = { insert, insertItem, findAll, findByIdForUpdate, findItems, updateStatus, cancelPending, findStatusByBuyer };