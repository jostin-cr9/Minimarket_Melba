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

async function findAll() {
  const [users] = await db.execute(
    'SELECT id, name, username, role, active, created_at AS createdAt FROM users ORDER BY created_at DESC');
  return users;
}

module.exports = { findByUsername, create, findAll };