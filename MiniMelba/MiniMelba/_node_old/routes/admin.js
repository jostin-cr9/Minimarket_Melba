const express = require('express');
const productDao = require('../dao/productDao');
const userDao = require('../dao/userDao');
const saleDao = require('../dao/saleDao');
const { asyncRoute, requireRole } = require('../_node_old/dao/middleware/auth');

const router = express.Router();

router.get('/summary', requireRole('admin'), asyncRoute(async (req, res) => {
  const [summary, lowStock] = await Promise.all([productDao.getSummary(), productDao.findLowStock()]);
  res.json({ summary, lowStock });
}));

router.get('/users', requireRole('admin'), asyncRoute(async (req, res) => {
  res.json({ users: await userDao.findAll() });
}));

router.get('/sales', requireRole('admin'), asyncRoute(async (req, res) => {
  res.json({ sales: await saleDao.findAll() });
}));

module.exports = router;