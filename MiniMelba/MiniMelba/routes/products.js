const express = require('express');
const productDao = require('../dao/productDao');
const logger = require('../logger');
const { asyncRoute, requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function validateProduct(body) {
  return typeof body.code === 'string' && body.code.trim().length > 0 && body.code.length <= 30 &&
    typeof body.name === 'string' && body.name.trim().length > 0 && body.name.length <= 120 &&
    typeof body.category === 'string' && body.category.trim().length > 0 && body.category.length <= 60 &&
    Number.isFinite(Number(body.price)) && Number(body.price) > 0 &&
    Number.isInteger(Number(body.stock)) && Number(body.stock) >= 0;
}

// Convierte el cuerpo de la petición en datos limpios para el DAO
function cleanProduct(body) {
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

router.get('/', requireAuth, asyncRoute(async (req, res) => {
  res.json({ products: await productDao.findAllActive() });
}));

router.post('/', requireRole('admin'), asyncRoute(async (req, res) => {
  if (!validateProduct(req.body)) return res.status(400).json({ error: 'Completa correctamente los datos del producto.' });
  try {
    const id = await productDao.create(cleanProduct(req.body));
    logger.info('Producto creado', { productId: id, code: req.body.code.trim(), by: req.session.user.username });
    res.status(201).json({ product: { id, ...req.body } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un producto con ese código.' });
    throw error;
  }
}));

router.put('/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  if (!validateProduct(req.body)) return res.status(400).json({ error: 'Completa correctamente los datos del producto.' });
  try {
    const changed = await productDao.update(req.params.id, cleanProduct(req.body));
    if (!changed) return res.status(404).json({ error: 'No se encontró el producto.' });
    logger.info('Producto editado', { productId: Number(req.params.id), by: req.session.user.username });
    res.json({ ok: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un producto con ese código.' });
    throw error;
  }
}));

router.delete('/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const changed = await productDao.deactivate(req.params.id);
  if (!changed) return res.status(404).json({ error: 'No se encontró el producto.' });
  logger.info('Producto eliminado', { productId: Number(req.params.id), by: req.session.user.username });
  res.status(204).end();
}));

module.exports = router;