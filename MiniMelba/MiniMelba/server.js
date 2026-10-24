require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');
const db = require('./db');
const logger = require('./logger');
const { asyncRoute } = require('./middleware/auth');

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

// ---- APIs (controlador): cada archivo de routes/ usa su DAO ----
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/admin/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta de API no encontrada.' }));

// ---- Vista: páginas estáticas ----
// Archivos internos que no deben descargarse desde el navegador
app.use((req, res, next) => /^\/(logs|logger\.js|server\.js|db\.js|schema\.sql|scripts|dao|routes|middleware|services|package(-lock)?\.json)(\/|$)/i.test(req.path) ? res.status(404).end() : next());
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