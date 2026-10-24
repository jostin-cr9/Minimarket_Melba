require('dotenv').config();
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');
const db = require('./db');
const logger = require('./logger');
const { asyncRoute, requireAuth, requireRole } = require('./middleware/auth');

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

app.get('/api/health', asyncRoute(async (req, res) => {
  await db.query('SELECT 1');
  res.json({ status: 'ok', database: 'connected' });
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

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
  return {
    range,
    label: REPORT_RANGES[range],
    since,
    resumen: {
      ventas: Number(totales[0].ventas),
      unidades: Number(unidades[0].unidades),
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

const ExcelJS = require('exceljs');

app.get('/api/admin/reports/excel', requireRole('admin'), asyncRoute(async (req, res) => {
  const range = String(req.query.range || 'day');
  if (!Object.hasOwn(REPORT_RANGES, range)) {
    return res.status(400).json({ error: 'Periodo no válido. Usa: day, week, month, year o 5years.' });
  }

  const report = await buildReport(range);
  const [detalle] = await db.execute(
    `SELECT p.code AS codigo, MAX(si.product_name) AS producto,
       SUM(si.quantity) AS cantidad, SUM(si.quantity * si.unit_price) AS total
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN products p ON p.id = si.product_id
     WHERE s.created_at >= ?
     GROUP BY si.product_id, p.code
     ORDER BY cantidad DESC, total DESC`, [report.since]);
  const [ventas] = await db.execute(
    `SELECT s.transaction_code AS transaccion, s.created_at AS fecha, u.username AS vendedor,
       s.customer_name AS cliente, s.payment_method AS pago, s.total
     FROM sales s JOIN users u ON u.id = s.seller_id
     WHERE s.created_at >= ?
     ORDER BY s.created_at DESC LIMIT 5000`, [report.since]);

  const MONEY = '"S/ "#,##0.00';
  const GREEN = 'FF267447';
  const fmtFecha = (d) => new Date(d).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  const styleHeader = (row) => row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Minimarket Melba';
  wb.created = new Date();

  // ---- Hoja 1: Resumen ----
  const ws = wb.addWorksheet('Resumen');
  ws.columns = [{ width: 34 }, { width: 18 }, { width: 14 }, { width: 18 }];
  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = 'INFORME DE VENTAS - MINIMARKET MELBA';
  ws.getCell('A1').font = { bold: true, size: 16, color: { argb: GREEN } };
  ws.getCell('A2').value = `Período: ${report.label}`;
  ws.getCell('A3').value = `Desde: ${fmtFecha(report.since)}`;
  ws.getCell('A4').value = `Generado: ${fmtFecha(new Date())}`;

  const r = report.resumen;
  [
    ['Número de ventas', r.ventas, null],
    ['Unidades vendidas', r.unidades, null],
    ['TOTAL DE VENTAS', r.total, MONEY]
  ].forEach(([label, valor, fmt], i) => {
    const row = ws.getRow(6 + i);
    row.getCell(1).value = label;
    row.getCell(2).value = valor;
    if (fmt) row.getCell(2).numFmt = fmt;
    row.font = { bold: i === 2 };
  });

  let fila = 10;
  ws.getCell(`A${fila}`).value = 'Ventas por vendedor';
  ws.getCell(`A${fila}`).font = { bold: true, size: 12 };
  fila++;
  const encV = ws.getRow(fila);
  encV.values = ['Vendedor', 'Usuario', 'Ventas', 'Total'];
  styleHeader(encV);
  report.vendedores.forEach(v => {
    fila++;
    const row = ws.getRow(fila);
    row.values = [v.vendedor, v.username, v.ventas, v.total];
    row.getCell(4).numFmt = MONEY;
  });

  // ---- Hoja 2: Productos ----
  const wp = wb.addWorksheet('Productos');
  wp.columns = [
    { header: 'N.º de artículo', key: 'codigo', width: 16 },
    { header: 'Nombre del artículo', key: 'producto', width: 34 },
    { header: 'Precio prom.', key: 'precio', width: 14, style: { numFmt: MONEY } },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'Total', key: 'total', width: 14, style: { numFmt: MONEY } }
  ];
  const filasProd = detalle.map(d => {
    const cantidad = Number(d.cantidad);
    const total = reportMoney(d.total);
    return { codigo: d.codigo, producto: d.producto, precio: reportMoney(total / cantidad), cantidad, total };
  });
  wp.addRows(filasProd);
  if (filasProd.length) {
    const last = wp.rowCount;
    const sum = (k) => reportMoney(filasProd.reduce((s, f) => s + f[k], 0));
    const t = wp.addRow({ producto: 'TOTAL' });
    [['D', 'cantidad'], ['E', 'total']].forEach(([col, k]) => {
      t.getCell(col).value = { formula: `SUM(${col}2:${col}${last})`, result: sum(k) };
    });
    t.font = { bold: true };
  }
  styleHeader(wp.getRow(1));
  wp.views = [{ state: 'frozen', ySplit: 1 }];

  // ---- Hoja 3: Ventas por día ----
  const wd = wb.addWorksheet('Ventas por día');
  wd.columns = [
    { header: 'Fecha', key: 'dia', width: 14 },
    { header: 'N.º de ventas', key: 'ventas', width: 14 },
    { header: 'Total', key: 'total', width: 14, style: { numFmt: MONEY } }
  ];
  wd.addRows(report.porDia);
  styleHeader(wd.getRow(1));
  wd.views = [{ state: 'frozen', ySplit: 1 }];

  // ---- Hoja 4: Ventas ----
  const wv = wb.addWorksheet('Ventas');
  wv.columns = [
    { header: 'Transacción', key: 'transaccion', width: 22 },
    { header: 'Fecha', key: 'fecha', width: 18 },
    { header: 'Vendedor', key: 'vendedor', width: 16 },
    { header: 'Cliente', key: 'cliente', width: 36 },
    { header: 'Pago', key: 'pago', width: 14 },
    { header: 'Total', key: 'total', width: 14, style: { numFmt: MONEY } }
  ];
  wv.addRows(ventas.map(v => ({ ...v, fecha: fmtFecha(v.fecha), total: Number(v.total) })));
  styleHeader(wv.getRow(1));
  wv.views = [{ state: 'frozen', ySplit: 1 }];

  const archivo = `reporte-ventas-${range}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${archivo}"`);
  await wb.xlsx.write(res);
  res.end();
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta de API no encontrada.' }));
// Archivos internos que no deben descargarse desde el navegador
app.use((req, res, next) => /^\/(logs|logger\.js|server\.js|db\.js|schema\.sql|scripts|dao|routes|middleware|package(-lock)?\.json)(\/|$)/i.test(req.path) ? res.status(404).end() : next());
app.use(express.static(__dirname, {
  dotfiles: 'deny', index: 'index.html', setHeaders(res, filePath) {
    if (/\.(env|sql)$/.test(filePath) || /(^|[\\/])(server|db)\.js$/.test(filePath) || /(^|[\\/])scripts([\\/])/.test(filePath) || /(^|[\\/])package(-lock)?\.json$/.test(filePath)) res.status(404);
  }
}));
app.use((error, req, res, next) => {
  logger.error('Error no controlado', { method: req.method, url: req.originalUrl, code: error.code, message: error.message, stack: error.stack });
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Ocurrió un error interno. Intenta nuevamente.' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => logger.info(`Minimarket Melba listo en http://localhost:${port}`));
db.query('SELECT 1')
  .then(() => logger.info('Conexión a MySQL correcta'))
  .catch(error => logger.error('No se pudo conectar a MySQL', { code: error.code, message: error.message }));
process.on('unhandledRejection', reason => logger.error('Promesa rechazada sin manejar', { reason: String(reason) }));
