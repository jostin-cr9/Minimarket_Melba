// Demo local: controla navegación en el navegador. No reemplaza autenticación de servidor.
const AUTH_SESSION_KEY = 'melba_session';
function currentUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null'); } catch { return null; }
}
function requireRole(role) {
  const user = currentUser();
  if (!user) { location.replace('index.html'); return null; }
  if (role && user.role !== role) {
    location.replace(user.role === 'vendedor' ? 'vendedor.html' : user.role === 'admin' ? 'admin.html' : 'comprador.html');
    return null;
  }
  return user;
}
function logout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  location.replace('index.html');
}
