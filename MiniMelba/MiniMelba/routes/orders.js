const express = require('express');
const orderDao = require('../dao/orderDao');
const productDao = require('../dao/productDao');
const saleDao = require('../dao/saleDao');
const { withTransaction } = require('../dao/transaction');
const logger = require('../logger');
const { asyncRoute, requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const PAYMENTS = { 'Efectivo': 'Efectivo', 'Tarjeta': 'Tarjeta', 'Yape/Plin': 'Yape/Plin', 'Yape / Plin': 'Yape/Plin' };
const DELIVERY_TYPES = ['Recojo en tienda', 'Delivery'];
const ORDER_TRANSITIONS = {
  pendiente: ['armado', 'completado', 'cancelado'],
  armado: ['pendiente', 'completado', 'cancelado'],
  completado: [],
  cancelado: []
};
const fail = (status, message) => Object.assign(new Error(message), { status });

// El comprador envía su pedido
router.post('/', requireRole('comprador'), asyncRoute(async (req, res) => {
  const { delivery, address, payment, items } = req.body;
  const paymentMethod = Object.hasOwn(PAYMENTS, payment) ? PAYMENTS[payment] : undefined;
  if (!DELIVERY_TYPES.includes(delivery)) return res.status(400).json({ error: 'Selecciona el tipo de entrega.' });
  if (!paymentMethod) return res.status(400).json({ error: 'Selecciona un método de pago válido.' });
  if (delivery === 'Delivery' && (typeof address !== 'string' || !address.trim() || address.length > 255)) return res.status(400).json({ error: 'Ingresa la dirección de entrega.' });
  if (!Array.isArray(items) || items.length < 1 || items.length > 100) return res.status(400).json({ error: 'Agrega al menos un producto.' });

  const normalized = new Map();
  for (const item of items) {
    const productId = Number(item.productId), quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) return res.status(400).json({ error: 'Revisa las cantidades de los productos.' });
    normalized.set(productId, (normalized.get(productId) || 0) + quantity);
  }

  try {
    const created = await withTransaction(async conn => {
      let total = 0;
      const details = [];
      for (const [productId, quantity] of normalized) {
        const product = await productDao.findActiveForOrder(conn, productId);
        if (!product) throw fail(409, 'Un producto del pedido ya no está disponible.');
        if (product.stock < quantity) throw fail(409, `Stock insuficiente para ${product.name}. Quedan ${product.stock}.`);
        total += Number(product.price) * quantity;
        details.push({ ...product, quantity });
      }
      const orderId = await orderDao.insert(conn, {
        buyerId: req.session.user.id,
        customerName: req.session.user.name,
        delivery,
        address: delivery === 'Delivery' ? address.trim() : null,
        paymentMethod,
        total: total.toFixed(2)
      });
      for (const item of details) {
        await orderDao.insertItem(conn, { orderId, productId: item.id, productName: item.name, unit: item.unit, quantity: item.quantity, unitPrice: item.price });
      }
      return { orderId, total: Number(total.toFixed(2)) };
    });
    logger.info('Pedido creado', { orderId: created.orderId, buyer: req.session.user.username, total: created.total });
    res.status(201).json({ order: { id: created.orderId, code: `PED-${String(created.orderId).padStart(4, '0')}`, total: created.total, status: 'pendiente' } });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    throw error;
  }
}));

// Lista de pedidos: el comprador solo ve los suyos; vendedor y admin ven todos
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const { role, id } = req.session.user;
  const { status } = req.query;
  if (status && !Object.keys(ORDER_TRANSITIONS).includes(status)) return res.status(400).json({ error: 'Estado no válido.' });
  const orders = await orderDao.findAll({ buyerId: role === 'comprador' ? id : null, status: status || null });
  res.json({ orders });
}));

// El personal cambia el estado; al completar se registra la venta y se descuenta el stock
router.patch('/:id/status', requireRole('vendedor', 'admin'), asyncRoute(async (req, res) => {
  const orderId = Number(req.params.id);
  const { status } = req.body;
  if (!Number.isInteger(orderId) || orderId < 1 || !Object.keys(ORDER_TRANSITIONS).includes(status)) return res.status(400).json({ error: 'Datos no válidos.' });

  try {
    const previous = await withTransaction(async conn => {
      const order = await orderDao.findByIdForUpdate(conn, orderId);
      if (!order) throw fail(404, 'No se encontró el pedido.');
      if (!ORDER_TRANSITIONS[order.status].includes(status)) throw fail(409, `Un pedido ${order.status} no puede pasar a ${status}.`);

      let saleId = null;
      if (status === 'completado') {
        const items = await orderDao.findItems(conn, orderId);
        for (const item of items) {
          const product = await productDao.lockStock(conn, item.product_id);
          if (!product || product.stock < item.quantity) throw fail(409, `Stock insuficiente para ${item.product_name}.`);
        }
        saleId = await saleDao.insert(conn, {
          transactionCode: order.order_code,
          sellerId: req.session.user.id,
          customerName: order.customer_name,
          paymentMethod: order.payment_method,
          total: order.total
        });
        for (const item of items) {
          await saleDao.insertItem(conn, { saleId, productId: item.product_id, productName: item.product_name, quantity: item.quantity, unitPrice: item.unit_price });
          await productDao.decreaseStock(conn, item.product_id, item.quantity);
        }
      }
      await orderDao.updateStatus(conn, { id: orderId, status, sellerId: req.session.user.id, saleId });
      return order.status;
    });
    logger.info('Cambio de estado de pedido', { orderId, from: previous, to: status, by: req.session.user.username });
    res.json({ ok: true, status });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Este pedido ya fue registrado como venta.' });
    throw error;
  }
}));

// El comprador cancela SU pedido, solo si sigue pendiente
router.patch('/:id/cancel', requireRole('comprador'), asyncRoute(async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId < 1) return res.status(400).json({ error: 'Datos no válidos.' });
  const buyerId = req.session.user.id;

  if (await orderDao.cancelPending(orderId, buyerId)) {
    logger.info('Pedido cancelado por el cliente', { orderId, buyer: req.session.user.username });
    return res.json({ ok: true, status: 'cancelado' });
  }
  const current = await orderDao.findStatusByBuyer(orderId, buyerId);
  if (!current) return res.status(404).json({ error: 'No se encontró el pedido.' });
  res.status(409).json({ error: `Este pedido ya está ${current} y no se puede cancelar.` });
}));

module.exports = router;