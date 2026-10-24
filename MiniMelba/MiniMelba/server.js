require('dotenv').config();
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const db = require('./db');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'minimelba',
  schema: { tableName: 'user_sessions' }
});

app.disable('x-powered-by');
if (isProduction) app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(session({
  name: 'melba.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-this-session-secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 8 * 60 * 60 * 1000 }
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const publicUser = user => ({ id: user.id, name: user.name, username: user.username, role: user.role });
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
    if (!roles.includes(req.session.user.role)) return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
    next();
  };
}
function validateProduct(body) {
  return typeof body.code === 'string' && body.code.trim().length > 0 && body.code.length <= 30 &&
    typeof body.name === 'string' && body.name.trim().length > 0 && body.name.length <= 120 &&
    typeof body.category === 'string' && body.category.trim().length > 0 && body.category.length <= 60 &&
    Number.isFinite(Number(body.price)) && Number(body.price) > 0 &&
    Number.isInteger(Number(body.stock)) && Number(body.stock) >= 0;
}

app.get('/api/health', asyncRoute(async (req, res) => {
  await db.query('SELECT 1');
  res.json({ status: 'ok', database: 'connected' });
}));

app.post('/api/auth/register', authLimiter, asyncRoute(async (req, res) => {
  const { name, username, password, role } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.length > 120 || typeof username !== 'string' || !/^[a-zA-Z0-9_.-]{3,50}$/.test(username) || typeof password !== 'string' || password.length < 8 || password.length > 200) {
    return res.status(400).json({ error: 'Revisa los datos. La contraseña debe tener 8 caracteres como mínimo.' });
  }
  if (!['comprador', 'vendedor'].includes(role)) return res.status(400).json({ error: 'El rol elegido no se puede registrar desde la página pública.' });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const [result] = await db.execute('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)', [name.trim(), username.trim().toLowerCase(), passwordHash, role]);
    const user = { id: result.insertId, name: name.trim(), username: username.trim().toLowerCase(), role };
    await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    req.session.user = user;
    res.status(201).json({ user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese nombre de usuario ya está registrado.' });
    throw error;
  }
}));

app.post('/api/auth/login', authLimiter, asyncRoute(async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const [rows] = await db.execute('SELECT id, name, username, role, password_hash, active FROM users WHERE username = ? LIMIT 1', [username]);
  const user = rows[0];
  if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  req.session.user = publicUser(user);
  res.json({ user: req.session.user });
}));

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.session.user }));
app.post('/api/auth/logout', (req, res) => req.session.destroy(err => {
  if (err) return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
  res.clearCookie('melba.sid', { httpOnly: true, sameSite: 'lax', secure: isProduction });
  res.status(204).end();
}));

app.get('/api/products', requireAuth, asyncRoute(async (req, res) => {
  const [rows] = await db.execute('SELECT id, code, name, category, unit, price, stock, image FROM products WHERE active = TRUE ORDER BY name');
  res.json({ products: rows });
}));
app.post('/api/products', requireRole('admin'), asyncRoute(async (req, res) => {
  if (!validateProduct(req.body)) return res.status(400).json({ error: 'Completa correctamente los datos del producto.' });
  const { code, name, category, unit = 'unidad', price, stock, image = null } = req.body;
  try {
    const [result] = await db.execute('INSERT INTO products (code, name, category, unit, price, stock, image) VALUES (?, ?, ?, ?, ?, ?, ?)', [code.trim(), name.trim(), category.trim(), String(unit).slice(0, 40), Number(price), Number(stock), image || null]);
    res.status(201).json({ product: { id: result.insertId, ...req.body } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un producto con ese código.' });
    throw error;
  }
}));
app.put('/api/products/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  if (!validateProduct(req.body)) return res.status(400).json({ error: 'Completa correctamente los datos del producto.' });
  const { code, name, category, unit = 'unidad', price, stock, image = null } = req.body;
  try {
    const [result] = await db.execute('UPDATE products SET code=?, name=?, category=?, unit=?, price=?, stock=?, image=? WHERE id=? AND active=TRUE', [code.trim(), name.trim(), category.trim(), String(unit).slice(0, 40), Number(price), Number(stock), image || null, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'No se encontró el producto.' });
    res.json({ ok: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un producto con ese código.' });
    throw error;
  }
}));
app.delete('/api/products/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const [result] = await db.execute('UPDATE products SET active=FALSE WHERE id=? AND active=TRUE', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'No se encontró el producto.' });
  res.status(204).end();
}));

app.get('/api/admin/summary', requireRole('admin'), asyncRoute(async (req, res) => {
  const [[summary]] = await db.query(`SELECT
    (SELECT COUNT(*) FROM products WHERE active=TRUE) AS productCount,
    (SELECT COALESCE(SUM(stock),0) FROM products WHERE active=TRUE) AS stockUnits,
    (SELECT COUNT(*) FROM sales) AS saleCount,
    (SELECT COUNT(*) FROM products WHERE active=TRUE AND stock<=5) AS lowStockCount`);
  const [lowStock] = await db.execute('SELECT id, code, name, category, price, stock FROM products WHERE active=TRUE AND stock<=5 ORDER BY stock, name');
  res.json({ summary, lowStock });
}));
app.get('/api/admin/users', requireRole('admin'), asyncRoute(async (req, res) => {
  const [users] = await db.execute('SELECT id, name, username, role, active, created_at AS createdAt FROM users ORDER BY created_at DESC');
  res.json({ users });
}));
app.get('/api/admin/sales', requireRole('admin'), asyncRoute(async (req, res) => {
  const [sales] = await db.execute(`SELECT s.id, s.transaction_code AS transaccion, s.created_at AS fecha,
    u.username AS vendedor, s.customer_name AS cliente, s.payment_method AS pago, s.total
    FROM sales s JOIN users u ON u.id=s.seller_id ORDER BY s.created_at DESC LIMIT 500`);
  res.json({ sales });
}));

app.post('/api/sales', requireRole('vendedor'), asyncRoute(async (req, res) => {
  const { transactionCode, customerName, paymentMethod, items } = req.body;
  if (typeof transactionCode !== 'string' || !Array.isArray(items) || items.length < 1 || items.length > 100 || !['Efectivo', 'Tarjeta', 'Yape/Plin'].includes(paymentMethod)) return res.status(400).json({ error: 'Datos de venta incompletos o incorrectos.' });
  const normalized = new Map();
  for (const item of items) {
    const productId = Number(item.productId), quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) return res.status(400).json({ error: 'Revisa las cantidades de productos.' });
    normalized.set(productId, (normalized.get(productId) || 0) + quantity);
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let total = 0;
    const details = [];
    for (const [productId, quantity] of normalized) {
      const [rows] = await conn.execute('SELECT id, name, price, stock FROM products WHERE id=? AND active=TRUE FOR UPDATE', [productId]);
      const product = rows[0];
      if (!product || product.stock < quantity) throw Object.assign(new Error(`Stock insuficiente para ${product?.name || 'un producto'}.`), { status: 409 });
      total += Number(product.price) * quantity;
      details.push({ ...product, quantity });
    }
    const [sale] = await conn.execute('INSERT INTO sales (transaction_code, seller_id, customer_name, payment_method, total) VALUES (?, ?, ?, ?, ?)', [transactionCode, req.session.user.id, String(customerName || 'Cliente genérico').slice(0, 120), paymentMethod, total.toFixed(2)]);
    for (const item of details) {
      await conn.execute('INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)', [sale.insertId, item.id, item.name, item.quantity, item.price]);
      await conn.execute('UPDATE products SET stock=stock-? WHERE id=?', [item.quantity, item.id]);
    }
    await conn.commit();
    res.status(201).json({ saleId: sale.insertId, total: Number(total.toFixed(2)) });
  } catch (error) {
    await conn.rollback();
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código de transacción ya existe. Intenta completar nuevamente.' });
    throw error;
  } finally { conn.release(); }
}));

//  PEDIDOS 
const PAYMENTS = { 'Efectivo': 'Efectivo', 'Tarjeta': 'Tarjeta', 'Yape/Plin': 'Yape/Plin', 'Yape / Plin': 'Yape/Plin' };
const DELIVERY_TYPES = ['Recojo en tienda', 'Delivery'];
const ORDER_TRANSITIONS = {
  pendiente: ['armado', 'completado', 'cancelado'],
  armado: ['pendiente', 'completado', 'cancelado'],
  completado: [],
  cancelado: []
};

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

// El comprador envía su pedido
app.post('/api/orders', requireRole('comprador'), asyncRoute(async (req, res) => {
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

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let total = 0;
    const details = [];
    for (const [productId, quantity] of normalized) {
      const [rows] = await conn.execute('SELECT id, name, unit, price, stock FROM products WHERE id=? AND active=TRUE', [productId]);
      const product = rows[0];
      if (!product) throw Object.assign(new Error('Un producto del pedido ya no está disponible.'), { status: 409 });
      if (product.stock < quantity) throw Object.assign(new Error(`Stock insuficiente para ${product.name}. Quedan ${product.stock}.`), { status: 409 });
      total += Number(product.price) * quantity;
      details.push({ ...product, quantity });
    }
    const [order] = await conn.execute(
      'INSERT INTO orders (order_code, buyer_id, customer_name, delivery_type, address, payment_method, total) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [require('node:crypto').randomUUID(), req.session.user.id, req.session.user.name, delivery, delivery === 'Delivery' ? address.trim() : null, paymentMethod, total.toFixed(2)]
    );
    await conn.execute("UPDATE orders SET order_code = CONCAT('PED-', LPAD(id, 4, '0')) WHERE id = ?", [order.insertId]);
    for (const item of details) {
      await conn.execute('INSERT INTO order_items (order_id, product_id, product_name, unit, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)', [order.insertId, item.id, item.name, item.unit, item.quantity, item.price]);
    }
    await conn.commit();
    res.status(201).json({ order: { id: order.insertId, code: `PED-${String(order.insertId).padStart(4, '0')}`, total: Number(total.toFixed(2)), status: 'pendiente' } });
  } catch (error) {
    await conn.rollback();
    if (error.status) return res.status(error.status).json({ error: error.message });
    throw error;
  } finally { conn.release(); }
}));

// Lista de pedidos: el comprador solo ve los suyos; vendedor y admin ven todos
app.get('/api/orders', requireAuth, asyncRoute(async (req, res) => {
  const { role, id } = req.session.user;
  const conditions = [];
  const params = [];
  if (role === 'comprador') { conditions.push('buyer_id = ?'); params.push(id); }
  if (req.query.status) {
    if (!Object.keys(ORDER_TRANSITIONS).includes(req.query.status)) return res.status(400).json({ error: 'Estado no válido.' });
    conditions.push('status = ?'); params.push(req.query.status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [orders] = await db.execute(
    `SELECT id, order_code AS code, customer_name AS customer, delivery_type AS delivery, address, payment_method AS payment, total, status, created_at AS createdAt
     FROM orders ${where} ORDER BY created_at DESC LIMIT 200`, params);
  res.json({ orders: await attachItems(orders) });
}));

// El personal cambia el estado; al completar se registra la venta y se descuenta el stock
app.patch('/api/orders/:id/status', requireRole('vendedor', 'admin'), asyncRoute(async (req, res) => {
  const orderId = Number(req.params.id);
  const { status } = req.body;
  if (!Number.isInteger(orderId) || orderId < 1 || !Object.keys(ORDER_TRANSITIONS).includes(status)) return res.status(400).json({ error: 'Datos no válidos.' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT id, order_code, customer_name, payment_method, total, status FROM orders WHERE id=? FOR UPDATE', [orderId]);
    const order = rows[0];
    if (!order) throw Object.assign(new Error('No se encontró el pedido.'), { status: 404 });
    if (!ORDER_TRANSITIONS[order.status].includes(status)) throw Object.assign(new Error(`Un pedido ${order.status} no puede pasar a ${status}.`), { status: 409 });

    let saleId = null;
    if (status === 'completado') {
      const [items] = await conn.execute('SELECT product_id, product_name, quantity, unit_price FROM order_items WHERE order_id=?', [orderId]);
      for (const item of items) {
        const [prod] = await conn.execute('SELECT stock FROM products WHERE id=? FOR UPDATE', [item.product_id]);
        if (!prod[0] || prod[0].stock < item.quantity) throw Object.assign(new Error(`Stock insuficiente para ${item.product_name}.`), { status: 409 });
      }
      const [sale] = await conn.execute(
        'INSERT INTO sales (transaction_code, seller_id, customer_name, payment_method, total) VALUES (?, ?, ?, ?, ?)',
        [order.order_code, req.session.user.id, order.customer_name, order.payment_method, order.total]);
      saleId = sale.insertId;
      for (const item of items) {
        await conn.execute('INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)', [saleId, item.product_id, item.product_name, item.quantity, item.unit_price]);
        await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
      }
    }
    await conn.execute('UPDATE orders SET status=?, seller_id=?, sale_id=COALESCE(?, sale_id) WHERE id=?', [status, req.session.user.id, saleId, orderId]);
    await conn.commit();
    res.json({ ok: true, status });
  } catch (error) {
    await conn.rollback();
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Este pedido ya fue registrado como venta.' });
    throw error;
  } finally { conn.release(); }
}));

// REPORTES (admin) 
const REPORT_RANGES = {
  day: 'Hoy',
  week: 'Últimos 7 días',
  month: 'Últimos 30 días',
  year: 'Último año',
  '5years': 'Últimos 5 años'
};
const REPORT_IGV = 0.18; // los precios ya incluyen IGV (igual que en la caja)
const reportMoney = (v) => Math.round((Number(v) || 0) * 100) / 100;

function reportSince(range) {
  const d = new Date();
  if (range === 'day') d.setHours(0, 0, 0, 0);
  else if (range === 'week') d.setDate(d.getDate() - 7);
  else if (range === 'month') d.setDate(d.getDate() - 30);
  else if (range === 'year') d.setFullYear(d.getFullYear() - 1);
  else d.setFullYear(d.getFullYear() - 5);
  return d;
}

async function buildReport(range) {
  const since = reportSince(range);
  const q = async (sql) => (await db.execute(sql, [since]))[0];

  const [totales, unidades, productos, vendedores, porDia, ventas] = await Promise.all([
    q('SELECT COUNT(*) AS ventas, COALESCE(SUM(total), 0) AS total FROM sales WHERE created_at >= ?'),
    q(`SELECT COALESCE(SUM(si.quantity), 0) AS unidades FROM sale_items si
       JOIN sales s ON s.id = si.sale_id WHERE s.created_at >= ?`),
    q(`SELECT si.product_id AS productId, MAX(si.product_name) AS producto,
         SUM(si.quantity) AS unidades, SUM(si.quantity * si.unit_price) AS monto
       FROM sale_items si JOIN sales s ON s.id = si.sale_id
       WHERE s.created_at >= ?
       GROUP BY si.product_id
       ORDER BY unidades DESC, monto DESC LIMIT 10`),
    q(`SELECT u.id AS sellerId, u.name AS vendedor, u.username, COUNT(*) AS ventas, SUM(s.total) AS total
       FROM sales s JOIN users u ON u.id = s.seller_id
       WHERE s.created_at >= ?
       GROUP BY u.id, u.name, u.username
       ORDER BY total DESC`),
    q(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS dia, COUNT(*) AS ventas, SUM(total) AS total
       FROM sales WHERE created_at >= ?
       GROUP BY dia ORDER BY dia`),
    q(`SELECT s.id, s.transaction_code AS transaccion, s.created_at AS fecha, u.username AS vendedor,
         s.customer_name AS cliente, s.payment_method AS pago, s.total
       FROM sales s JOIN users u ON u.id = s.seller_id
       WHERE s.created_at >= ?
       ORDER BY s.created_at DESC LIMIT 200`)
  ]);

  const total = reportMoney(totales[0].total);
  const subtotal = reportMoney(total / (1 + REPORT_IGV));
  return {
    range,
    label: REPORT_RANGES[range],
    since,
    resumen: {
      ventas: Number(totales[0].ventas),
      unidades: Number(unidades[0].unidades),
      subtotal,
      igv: reportMoney(total - subtotal),
      total
    },
    productos: productos.map(p => ({ ...p, unidades: Number(p.unidades), monto: reportMoney(p.monto) })),
    vendedores: vendedores.map(v => ({ ...v, ventas: Number(v.ventas), total: reportMoney(v.total) })),
    porDia: porDia.map(d => ({ ...d, ventas: Number(d.ventas), total: reportMoney(d.total) })),
    ventas
  };
}

app.get('/api/admin/reports', requireRole('admin'), asyncRoute(async (req, res) => {
  const range = String(req.query.range || 'day');
  if (!Object.hasOwn(REPORT_RANGES, range)) {
    return res.status(400).json({ error: 'Periodo no válido. Usa: day, week, month, year o 5years.' });
  }
  res.json(await buildReport(range));
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta de API no encontrada.' }));
app.use(express.static(__dirname, {
  dotfiles: 'deny', index: 'index.html', setHeaders(res, filePath) {
    if (/\.(env|sql)$/.test(filePath) || /(^|[\\/])(server|db)\.js$/.test(filePath) || /(^|[\\/])scripts([\\/])/.test(filePath) || /(^|[\\/])package(-lock)?\.json$/.test(filePath)) res.status(404);
  }
}));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Ocurrió un error interno. Intenta nuevamente.' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Minimarket Melba listo en http://localhost:${port}`));
