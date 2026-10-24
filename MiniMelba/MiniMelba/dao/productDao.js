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

// Eliminación lógica: el producto se desactiva, no se borra (así no se rompen las ventas antiguas)
async function deactivate(id) {
  const [result] = await db.execute('UPDATE products SET active=FALSE WHERE id=? AND active=TRUE', [id]);
  return result.affectedRows;
}

module.exports = { findAllActive, create, update, deactivate };