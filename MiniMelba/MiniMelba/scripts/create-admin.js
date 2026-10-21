require('dotenv').config();
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const bcrypt = require('bcryptjs');
const db = require('../db');

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const name = (await rl.question('Nombre del administrador: ')).trim();
    const username = (await rl.question('Usuario: ')).trim().toLowerCase();
    const password = (await rl.question('Contraseña (mínimo 8 caracteres): ')).trim();
    if (!name || !/^[a-z0-9_.-]{3,50}$/.test(username) || password.length < 8) throw new Error('Datos no válidos. Revisa nombre, usuario y contraseña.');
    const hash = await bcrypt.hash(password, 12);
    await db.execute('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, "admin")', [name, username, hash]);
    console.log(`Administrador ${username} creado.`);
  } finally { rl.close(); await db.end(); }
}
main().catch(error => { console.error(error.code === 'ER_DUP_ENTRY' ? 'Ese usuario ya existe.' : error.message); process.exitCode = 1; });
