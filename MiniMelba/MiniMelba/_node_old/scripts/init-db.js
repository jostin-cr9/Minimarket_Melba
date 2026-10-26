require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'minimelba',
    multipleStatements: true
  });
  try {
    const sql = await fs.readFile(path.join(__dirname, '..', 'schema.sql'), 'utf8');
    await connection.query(sql);
    console.log('Base de datos y tablas creadas. Productos iniciales listos.');
  } finally { await connection.end(); }
}
main().catch(error => { console.error('No se pudo inicializar MySQL:', error.message); process.exitCode = 1; });
