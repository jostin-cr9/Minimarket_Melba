
const ROLE_HOME = { admin: 'admin.html', vendedor: 'vendedor.html', comprador: 'comprador.html' };
let _usuarioPromise;

async function currentUser() {
  if (!_usuarioPromise) {
    _usuarioPromise = fetch('/api/auth/me')
      .then(async response => {
        if (!response.ok) return null;
        return (await response.json()).user;
      })
      .catch(() => null);
  }
  const user = await _usuarioPromise;
  if (!user) location.replace('index.html');
  return user;
}

async function requireRole(role) {
  const user = await currentUser();
  if (!user) { location.replace('index.html'); return null; }
  if (role && user.role !== role) {
    location.replace(ROLE_HOME[user.role] || 'index.html');
    return null;
  }
  return user;
}

async function logout() {
  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
  location.replace('index.html');
}
