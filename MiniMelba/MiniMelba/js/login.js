const ROLE_HOME = { admin: 'admin.html', vendedor: 'vendedor.html', comprador: 'comprador.html' };
const formLogin = document.getElementById('formLogin');
const formRegistro = document.getElementById('formRegistro');
const aviso = document.getElementById('avisoAuth');

function message(text) { aviso.textContent = text; aviso.classList.remove('oculto'); }
function goToRole(user) { location.href = ROLE_HOME[user.role] || 'comprador.html'; }

async function api(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

// Si ya hay sesión activa en el servidor, entra directo a su panel
(async () => {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) goToRole((await res.json()).user);
  } catch {}
})();

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

formLogin.addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('loginUsuario').value.trim().toLowerCase();
  const password = document.getElementById('loginClave').value;
  try {
    const { ok, status, data } = await api('/api/auth/login', { username, password });
    if (!ok) {
      return message(status === 429
        ? 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
        : (data.error || 'Usuario o contraseña incorrectos.'));
    }
    goToRole(data.user);
  } catch {
    message('No se pudo conectar con el servidor.');
  }
});

formRegistro.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('regNombre').value.trim();
  const username = document.getElementById('regUsuario').value.trim().toLowerCase();
  const password = document.getElementById('regClave').value;
  const role = document.getElementById('regRol').value;
  if (password.length < 8) return message('La contraseña debe tener al menos 8 caracteres.');
  try {
    const { ok, data } = await api('/api/auth/register', { name, username, password, role });
    if (!ok) return message(data.error || 'No se pudo crear la cuenta.');
    goToRole(data.user);
  } catch {
    message('No se pudo conectar con el servidor.');
  }
});