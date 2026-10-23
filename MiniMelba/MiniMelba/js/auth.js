
const ROLE_HOME = { admin: 'admin.html', vendedor: 'vendedor.html', comprador: 'comprador.html' };
let _usuarioCache;

function currentUser() {
  if (_usuarioCache !== undefined) return _usuarioCache;
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/auth/me', false);
    xhr.send();
    _usuarioCache = xhr.status === 200 ? JSON.parse(xhr.responseText).user : null;
  } catch {
    _usuarioCache = null;
  }
  return _usuarioCache;
}

function requireRole(role) {
  const user = currentUser();
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