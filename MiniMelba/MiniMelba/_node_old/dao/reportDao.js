const db = require('../db');

const query = async (sql, since) => (await db.execute(sql, [since]))[0];

async function getTotals(since) {
  const rows = await query('SELECT COUNT(*) AS ventas, COALESCE(SUM(total), 0) AS total FROM sales WHERE created_at >= ?', since);
  return rows[0];
}

async function getUnits(since) {
  const rows = await query(
    `SELECT COALESCE(SUM(si.quantity), 0) AS unidades FROM sale_items si
     JOIN sales s ON s.id = si.sale_id WHERE s.created_at >= ?`, since);
  return rows[0].unidades;
}

function topProducts(since) {
  return query(
    `SELECT si.product_id AS productId, MAX(si.product_name) AS producto,
       SUM(si.quantity) AS unidades, SUM(si.quantity * si.unit_price) AS monto
     FROM sale_items si JOIN sales s ON s.id = si.sale_id
     WHERE s.created_at >= ?
     GROUP BY si.product_id
     ORDER BY unidades DESC, monto DESC LIMIT 10`, since);
}

function bySeller(since) {
  return query(
    `SELECT u.id AS sellerId, u.name AS vendedor, u.username, COUNT(*) AS ventas, SUM(s.total) AS total
     FROM sales s JOIN users u ON u.id = s.seller_id
     WHERE s.created_at >= ?
     GROUP BY u.id, u.name, u.username
     ORDER BY total DESC`, since);
}

function byDay(since) {
  return query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS dia, COUNT(*) AS ventas, SUM(total) AS total
     FROM sales WHERE created_at >= ?
     GROUP BY dia ORDER BY dia`, since);
}

function findSales(since, limit) {
  const max = Number.isInteger(limit) && limit > 0 ? limit : 200; // el límite se valida antes de armar el SQL
  return query(
    `SELECT s.id, s.transaction_code AS transaccion, s.created_at AS fecha, u.username AS vendedor,
       s.customer_name AS cliente, s.payment_method AS pago, s.total
     FROM sales s JOIN users u ON u.id = s.seller_id
     WHERE s.created_at >= ?
     ORDER BY s.created_at DESC LIMIT ${max}`, since);
}

// Detalle por producto para la hoja "Productos" del Excel
function productDetail(since) {
  return query(
    `SELECT p.code AS codigo, MAX(si.product_name) AS producto,
       SUM(si.quantity) AS cantidad, SUM(si.quantity * si.unit_price) AS total
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN products p ON p.id = si.product_id
     WHERE s.created_at >= ?
     GROUP BY si.product_id, p.code
     ORDER BY cantidad DESC, total DESC`, since);
}

module.exports = { getTotals, getUnits, topProducts, bySeller, byDay, findSales, productDetail };