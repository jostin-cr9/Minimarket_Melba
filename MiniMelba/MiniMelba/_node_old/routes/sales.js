const express = require('express');
const productDao = require('../dao/productDao');
const saleDao = require('../dao/saleDao');
const { withTransaction } = require('../dao/transaction');
const logger = require('../logger');
const { asyncRoute, requireRole } = require('../_node_old/dao/middleware/auth');

const router = express.Router();
const fail = (status, message) => Object.assign(new Error(message), { status });

// Venta presencial desde la caja (solo vendedor)
router.post('/', requireRole('vendedor'), asyncRoute(async (req, res) => {
  const { transactionCode, customerName, paymentMethod, items } = req.body;
  if (typeof transactionCode !== 'string' || !Array.isArray(items) || items.length < 1 || items.length > 100 || !['Efectivo', 'Tarjeta', 'Yape/Plin'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Datos de venta incompletos o incorrectos.' });
  }
  const normalized = new Map();
  for (const item of items) {
    const productId = Number(item.productId), quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) return res.status(400).json({ error: 'Revisa las cantidades de productos.' });
    normalized.set(productId, (normalized.get(productId) || 0) + quantity);
  }

  try {
    const sale = await withTransaction(async conn => {
      let total = 0;
      const details = [];
      for (const [productId, quantity] of normalized) {
        const product = await productDao.findActiveForUpdate(conn, productId);
        if (!product || product.stock < quantity) throw fail(409, `Stock insuficiente para ${product?.name || 'un producto'}.`);
        total += Number(product.price) * quantity;
        details.push({ ...product, quantity });
      }
      const saleId = await saleDao.insert(conn, {
        transactionCode,
        sellerId: req.session.user.id,
        customerName: String(customerName || 'Cliente genérico').slice(0, 120),
        paymentMethod,
        total: total.toFixed(2)
      });
      for (const item of details) {
        await saleDao.insertItem(conn, { saleId, productId: item.id, productName: item.name, quantity: item.quantity, unitPrice: item.price });
        await productDao.decreaseStock(conn, item.id, item.quantity);
      }
      return { saleId, total: Number(total.toFixed(2)) };
    });
    logger.info('Venta registrada en caja', { saleId: sale.saleId, transactionCode, seller: req.session.user.username, total: sale.total });
    res.status(201).json(sale);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código de transacción ya existe. Intenta completar nuevamente.' });
    throw error;
  }
}));

module.exports = router;