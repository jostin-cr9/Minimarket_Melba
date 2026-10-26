const productDao = require('../dao/productDao');

function invalidProductError() {
  return Object.assign(new Error('Completa correctamente los datos del producto.'), { status: 400 });
}

function validateAndClean(body) {
  if (!body ||
    typeof body.code !== 'string' || !body.code.trim() || body.code.length > 30 ||
    typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120 ||
    typeof body.category !== 'string' || !body.category.trim() || body.category.length > 60 ||
    !Number.isFinite(Number(body.price)) || Number(body.price) <= 0 ||
    !Number.isInteger(Number(body.stock)) || Number(body.stock) < 0) {
    throw invalidProductError();
  }

  const { code, name, category, unit = 'unidad', price, stock, image = null } = body;
  return {
    code: code.trim(),
    name: name.trim(),
    category: category.trim(),
    unit: String(unit).slice(0, 40),
    price: Number(price),
    stock: Number(stock),
    image: image || null
  };
}

async function findAllActive() {
  return productDao.findAllActive();
}

async function create(input) {
  const product = validateAndClean(input);
  const id = await productDao.create(product);
  return { id, ...product };
}

async function update(id, input) {
  const product = validateAndClean(input);
  return productDao.update(id, product);
}

async function deactivate(id) {
  return productDao.deactivate(id);
}

module.exports = { findAllActive, create, update, deactivate };
