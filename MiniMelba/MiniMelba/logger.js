const path = require('node:path');
const fs = require('node:fs');
const winston = require('winston');

const logDir = path.join(__dirname, 'logs');
fs.mkdirSync(logDir, { recursive: true });

// Formato de cada línea: 2026-10-24 10:15:03 [WARN] Mensaje {"dato":"valor"}
const line = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `${timestamp} [${level.toUpperCase()}] ${message}${extra}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), line),
  transports: [
    new winston.transports.Console(),
    // Todo lo que sea info o superior
    new winston.transports.File({ filename: path.join(logDir, 'app.log'), maxsize: 1000000, maxFiles: 3 }),
    // Solo errores
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error', maxsize: 1000000, maxFiles: 3 })
  ]
});

module.exports = logger;