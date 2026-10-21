// ---- Datos de ejemplo (luego vendrán de la BD) ----
let pedidos = [
  { id: 1, cliente: 'María', total: 14.50, armado: false,
    items: [ { nombre: 'Leche Gloria', cant: '1 L' }, { nombre: 'Arroz Costeño', cant: '2 kg' } ] },
  { id: 2, cliente: 'Juan', total: 9.80, armado: false,
    items: [ { nombre: 'Aceite Primor', cant: '1 L' }, { nombre: 'Azúcar Rubia', cant: '1 kg' } ] },
  { id: 3, cliente: 'Carla', total: 13, armado: false,
    items: [ { nombre: 'Jabón', cant: '1 unidad' }, { nombre: 'Gaseosa Inca Kola', cant: '3 L' } ] }
];

const lista = document.getElementById('listaPedidos');
const vacio = document.getElementById('vacio');
const contador = document.getElementById('contador');
const btnCancelar = document.getElementById('btnCancelar');
const modal = document.getElementById('modal');
const modalTexto = document.getElementById('modalTexto');
let accionPendiente = null;

// ---- Render ----
function render() {
  lista.innerHTML = '';
  pedidos.forEach(p => {
    const card = document.createElement('article');
    card.className = 'pedido';
    card.innerHTML = `
      <div class="pedido-info">
        <h3>Pedido #${String(p.id).padStart(4, '0')} <small>· ${p.cliente}</small></h3>
        <ul>${p.items.map(i => `<li>${i.nombre} — <b>${i.cant}</b></li>`).join('')}</ul>
        <p class="total">Total: S/ ${p.total.toFixed(2)}</p>
      </div>
      <div class="pedido-botones">
        <button class="btn-armado ${p.armado ? 'activo' : ''}" title="Marcar como armado"></button>
        <button class="btn-ok" title="Completar venta">✔</button>
        <button class="btn-x" title="Eliminar pedido">✕</button>
      </div>`;

    // Círculo: pedido armado (se pone verde)
    card.querySelector('.btn-armado').addEventListener('click', () => {
      p.armado = !p.armado;
      render();
    });

    // Visto bueno: completar venta
    card.querySelector('.btn-ok').addEventListener('click', () => {
      pedirConfirmacion('¿Desea completar la venta?', () => {
        guardarVenta(p);
        quitarPedido(p.id);
      });
    });

    // X: eliminar pedido (solo visible en modo cancelar)
    card.querySelector('.btn-x').addEventListener('click', () => {
      pedirConfirmacion('¿Desea eliminar el pedido?', () => quitarPedido(p.id));
    });

    lista.appendChild(card);
  });

  contador.textContent = pedidos.length;
  vacio.classList.toggle('oculto', pedidos.length > 0);
}

function quitarPedido(id) {
  pedidos = pedidos.filter(p => p.id !== id);
  render();
}

// ---- Guardar venta (pendiente de BD) ----
function guardarVenta(pedido) {
  // TODO: enviar a la BD (pedido, vendedor, fecha, total) para el dashboard del admin
  console.log('Venta guardada:', pedido);
}

// ---- Modal Sí / No ----
function pedirConfirmacion(texto, alAceptar) {
  modalTexto.textContent = texto;
  accionPendiente = alAceptar;
  modal.classList.remove('oculto');
}
document.getElementById('modalSi').addEventListener('click', () => {
  modal.classList.add('oculto');
  if (accionPendiente) accionPendiente();
  accionPendiente = null;
});
document.getElementById('modalNo').addEventListener('click', () => {
  modal.classList.add('oculto');   // el pedido se queda en amarillo
  accionPendiente = null;
});

// ---- Botón Cancelar venta: activa/desactiva las X ----
btnCancelar.addEventListener('click', () => {
  const activo = lista.classList.toggle('modo-cancelar');
  btnCancelar.classList.toggle('activo', activo);
  btnCancelar.textContent = activo ? 'Salir de cancelar' : 'Cancelar venta';
});

render();