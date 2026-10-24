const db = require('../db');

async function findByUsername(username) {
  const [rows] = await db.execute(
    'SELECT id, name, username, role, password_hash, active FROM users WHERE username = ? LIMIT 1', [username]);
  return rows[0];
}

async function create({ name, username, passwordHash, role }) {
  const [result] = await db.execute(
    'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)', [name, username, passwordHash, role]);
  return result.insertId;
}

module.exports = { findByUsername, create };