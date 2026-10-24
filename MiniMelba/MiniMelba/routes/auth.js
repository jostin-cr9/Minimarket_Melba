const express = require('express');
const bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');
const userDao = require('../dao/userDao');
const logger = require('../logger');
const { asyncRoute, requireAuth } = require('../middleware/auth');

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
const publicUser = user => ({ id: user.id, name: user.name, username: user.username, role: user.role });

router.post('/register', authLimiter, asyncRoute(async (req, res) => {
  const { name, username, password, role } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.length > 120 || typeof username !== 'string' || !/^[a-zA-Z0-9_.-]{3,50}$/.test(username) || typeof password !== 'string' || password.length < 8 || password.length > 200) {
    return res.status(400).json({ error: 'Revisa los datos. La contraseña debe tener 8 caracteres como mínimo.' });
  }
  if (!['comprador', 'vendedor'].includes(role)) return res.status(400).json({ error: 'El rol elegido no se puede registrar desde la página pública.' });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const id = await userDao.create({ name: cleanName, username: cleanUsername, passwordHash, role });
    const user = { id, name: cleanName, username: cleanUsername, role };
    await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    req.session.user = user;
    logger.info('Cuenta registrada', { username: user.username, role: user.role, ip: req.ip });
    res.status(201).json({ user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese nombre de usuario ya está registrado.' });
    throw error;
  }
}));

router.post('/login', authLimiter, asyncRoute(async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = await userDao.findByUsername(username);
  if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) {
    logger.warn('Inicio de sesión fallido', { username: username.slice(0, 50), ip: req.ip });
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }
  await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  req.session.user = publicUser(user);
  logger.info('Inicio de sesión correcto', { username: user.username, role: user.role, ip: req.ip });
  res.json({ user: req.session.user });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: req.session.user }));

router.post('/logout', (req, res) => req.session.destroy(err => {
  if (err) return res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
  res.clearCookie('melba.sid', { httpOnly: true, sameSite: 'lax', secure: isProduction });
  res.status(204).end();
}));

module.exports = router;