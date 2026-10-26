const express = require('express');
const productService = require('../services/productService');
const logger = require('../logger');
const { asyncRoute, requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, asyncRoute(async (req, res) => {
  res.json({ products: await productService.findAllActive() });
}));

router.post('/', requireRole('admin'), asyncRoute(async (req, res) => {
  try {
    const product = await productService.create(req.body);
    logger.info('Producto creado', { productId: product.id, code: product.code, by: req.session.user.username });
    res.status(201).json({ product });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un producto con ese código.' });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    throw error;
  }
}));

router.put('/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  try {
    const changed = await productService.update(req.params.id, req.body);
    if (!changed) return res.status(404).json({ error: 'No se encontró el producto.' });
    logger.info('Producto editado', { productId: Number(req.params.id), by: req.session.user.username });
    res.json({ ok: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un producto con ese código.' });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    throw error;
  }
}));

router.delete('/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const changed = await productService.deactivate(req.params.id);
  if (!changed) return res.status(404).json({ error: 'No se encontró el producto.' });
  logger.info('Producto eliminado', { productId: Number(req.params.id), by: req.session.user.username });
  res.status(204).end();
}));

module.exports = router;
