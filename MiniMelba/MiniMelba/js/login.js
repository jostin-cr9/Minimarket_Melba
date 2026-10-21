const USERS_KEY = 'melba_users';
const SESSION_KEY = 'melba_session';
const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
const saveUsers = users => localStorage.setItem(USERS_KEY, JSON.stringify(users));
const formLogin = document.getElementById('formLogin');
const formRegistro = document.getElementById('formRegistro');
const aviso = document.getElementById('avisoAuth');

try {
  const existing = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (existing) location.replace(existing.role === 'vendedor' ? 'vendedor.html' : existing.role === 'admin' ? 'admin.html' : 'comprador.html');
} catch { localStorage.removeItem(SESSION_KEY); }

function message(text) { aviso.textContent = text; aviso.classList.remove('oculto'); }
function goToRole(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username, name: user.name, role: user.role }));
  location.href = user.role === 'vendedor' ? 'vendedor.html' : user.role === 'admin' ? 'admin.html' : 'comprador.html';
}
document.getElementById('irRegistro').addEventListener('click', e => {
  e.preventDefault(); aviso.classList.add('oculto'); formLogin.classList.add('oculto'); formRegistro.classList.remove('oculto');
});
document.getElementById('irLogin').addEventListener('click', e => {
  e.preventDefault(); aviso.classList.add('oculto'); formRegistro.classList.add('oculto'); formLogin.classList.remove('oculto');
});
document.querySelectorAll('.ojo').forEach(btn => btn.addEventListener('click', () => {
  const input = document.getElementById(btn.dataset.target);
  input.type = input.type === 'password' ? 'text' : 'password';
}));
formLogin.addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('loginUsuario').value.trim().toLowerCase();
  const password = document.getElementById('loginClave').value;
  const user = getUsers().find(u => u.username === username && u.password === password);
  if (!user) return message('Usuario o contraseña incorrectos.');
  goToRole(user);
});
formRegistro.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('regNombre').value.trim();
  const username = document.getElementById('regUsuario').value.trim().toLowerCase();
  const password = document.getElementById('regClave').value;
  const role = document.getElementById('regRol').value;
  if (password.length < 6) return message('La contraseña debe tener al menos 6 caracteres.');
  const users = getUsers();
  if (users.some(u => u.username === username)) return message('Ese usuario ya existe. Elige otro.');
  const user = { name, username, password, role };
  users.push(user); saveUsers(users); goToRole(user);
});
