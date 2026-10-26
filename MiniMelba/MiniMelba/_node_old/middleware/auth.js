const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

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

module.exports = { asyncRoute, requireAuth, requireRole };