const db = require('../db');

async function findAllActive() {
  const [rows] = await db.execute(
    'SELECT id, code, name, category, unit, price, stock, image FROM products WHERE active = TRUE ORDER BY name');
  return rows;
}

async function create({ code, name, category, unit, price, stock, image }) {
  const [result] = await db.execute(
    'INSERT INTO products (code, name, category, unit, price, stock, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [code, name, category, unit, price, stock, image]);
  return result.insertId;
}

// Devuelve cuántas filas cambió (0 = no existe o ya estaba eliminado)
async function update(id, { code, name, category, unit, price, stock, image }) {
  const [result] = await db.execute(
    'UPDATE products SET code=?, name=?, category=?, unit=?, price=?, stock=?, image=? WHERE id=? AND active=TRUE',
    [code, name, category, unit, price, stock, image, id]);
  return result.affectedRows;
}

// Eliminación lógica: el producto se desactiva, no se borra ( no se rompen las ventas antiguas)
async function deactivate(id) {
  const [result] = await db.execute('UPDATE products SET active=FALSE WHERE id=? AND active=TRUE', [id]);
  return result.affectedRows;
}

// Usadas dentro de transacciones (pedidos y ventas)
async function findActiveForOrder(conn, id) {
  const [rows] = await conn.execute('SELECT id, name, unit, price, stock FROM products WHERE id=? AND active=TRUE', [id]);
  return rows[0];
}

async function lockStock(conn, id) {
  const [rows] = await conn.execute('SELECT stock FROM products WHERE id=? FOR UPDATE', [id]);
  return rows[0];
}

async function decreaseStock(conn, id, quantity) {
  await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, id]);
}

// La caja bloquea el producto mientras valida y descuenta el stock
async function findActiveForUpdate(conn, id) {
  const [rows] = await conn.execute('SELECT id, name, price, stock FROM products WHERE id=? AND active=TRUE FOR UPDATE', [id]);
  return rows[0];
}

// Para el resumen del panel admin
async function getSummary() {
  const [[summary]] = await db.query(`SELECT
    (SELECT COUNT(*) FROM products WHERE active=TRUE) AS productCount,
    (SELECT COALESCE(SUM(stock),0) FROM products WHERE active=TRUE) AS stockUnits,
    (SELECT COUNT(*) FROM sales) AS saleCount,
    (SELECT COUNT(*) FROM products WHERE active=TRUE AND stock<=5) AS lowStockCount`);
  return summary;
}

async function findLowStock() {
  const [rows] = await db.execute(
    'SELECT id, code, name, category, price, stock FROM products WHERE active=TRUE AND stock<=5 ORDER BY stock, name');
  return rows;
}

module.exports = {
  findAllActive, create, update, deactivate,
  findActiveForOrder, lockStock, decreaseStock,
  findActiveForUpdate, getSummary, findLowStock
};