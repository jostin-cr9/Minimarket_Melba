const usuarioActual = currentUser();

document.getElementById('userCod').textContent = usuarioActual.username + ' · Vendedor';
document.getElementById('menuUsuario').textContent = usuarioActual.username;
document.getElementById('menuRol').textContent = 'Vendedor';

const avatar = document.getElementById('btnAvatar');
if (usuarioActual.foto) {
  avatar.style.backgroundImage = `url('${usuarioActual.foto}')`;
} else {
  document.getElementById('avatarLetra').textContent = usuarioActual.username[0].toUpperCase();
}

// Abrir / cerrar menú
const menu = document.getElementById('menuPerfil');
avatar.addEventListener('click', e => {
  e.stopPropagation();
  menu.classList.toggle('oculto');
});
document.addEventListener('click', () => menu.classList.add('oculto'));

// Perfil: página pendiente
document.getElementById('linkPerfil').addEventListener('click', e => {
  e.preventDefault();
  // TODO: window.location.href = 'perfil.html';
});
document.getElementById('cerrarSesion').addEventListener('click', e => { e.preventDefault(); logout(); });
