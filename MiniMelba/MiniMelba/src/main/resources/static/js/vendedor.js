// ---- Pedidos: vienen de la API ----
let pedidos = [];
let ocupado = false;

const lista = document.getElementById('listaPedidos');
const vacio = document.getElementById('vacio');
const contador = document.getElementById('contador');
const btnCancelar = document.getElementById('btnCancelar');
const modal = document.getElementById('modal');
const modalTexto = document.getElementById('modalTexto');
let accionPendiente = null;

function esc(text) {
  const el = document.createElement('span');
  el.textContent = text ?? '';
  return el.innerHTML;
}

async function api(url, opciones) {
  const res = await fetch(url, opciones);
  if (res.status === 401) {
    location.replace('index.html');
    throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ocurrió un error. Intenta nuevamente.');
  return data;
}

async function cargarPedidos() {
  try {
    const [pendientes, armados] = await Promise.all([
      api('/api/orders?status=pendiente'),
      api('/api/orders?status=armado')
    ]);
    pedidos = [...pendientes.orders, ...armados.orders]
      .map(o => ({
        id: o.id,
        code: o.code,
        cliente: o.customer,
        entrega: o.delivery,
        direccion: o.address,
        pago: o.payment,
        total: Number(o.total),
        armado: o.status === 'armado',
        items: o.items
      }))
      .sort((a, b) => a.id - b.id);
    vacio.textContent = 'No hay pedidos pendientes';
  } catch (error) {
    vacio.textContent = error.message;
  }
  render();
}

async function cambiarEstado(id, status) {
  if (ocupado) return;
  ocupado = true;
  try {
    await api(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  } catch (error) {
    alert(error.message);
  } finally {
    ocupado = false;
    await cargarPedidos();
  }
}

// ---- Render ----
function render() {
  lista.innerHTML = '';
  pedidos.forEach(p => {
    const card = document.createElement('article');
    card.className = 'pedido';
    card.innerHTML = `
      <div class="pedido-info">
        <h3>Pedido ${esc(p.code)} <small>· ${esc(p.cliente)}</small></h3>
        <p style="margin:4px 0;font-size:.85rem;color:#666">${esc(p.entrega)} · ${esc(p.pago)}${p.entrega === 'Delivery' && p.direccion ? ' · ' + esc(p.direccion) : ''}</p>
        <ul>${p.items.map(i => `<li>${esc(i.name)} — <b>${i.quantity} × ${esc(i.unit)}</b></li>`).join('')}</ul>
        <p class="total">Total: S/ ${p.total.toFixed(2)}</p>
      </div>
      <div class="pedido-botones">
        <button class="btn-armado ${p.armado ? 'activo' : ''}" title="Marcar como armado"></button>
        <button class="btn-ok" title="Completar venta">✔</button>
        <button class="btn-x" title="Cancelar pedido">✕</button>
      </div>`;

    // Círculo: pedido armado (se pone verde); otro clic lo devuelve a pendiente
    card.querySelector('.btn-armado').addEventListener('click', () => {
      cambiarEstado(p.id, p.armado ? 'pendiente' : 'armado');
    });

    // Visto bueno: completar venta (el servidor crea la venta y descuenta el stock)
    card.querySelector('.btn-ok').addEventListener('click', () => {
      pedirConfirmacion('¿Desea completar la venta?', () => cambiarEstado(p.id, 'completado'));
    });

    // X: cancelar pedido (solo visible en modo cancelar)
    card.querySelector('.btn-x').addEventListener('click', () => {
      pedirConfirmacion('¿Desea cancelar el pedido?', () => cambiarEstado(p.id, 'cancelado'));
    });

    lista.appendChild(card);
  });

  contador.textContent = pedidos.length;
  vacio.classList.toggle('oculto', pedidos.length > 0);
}

//  Modal Sí / No 
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
  modal.classList.add('oculto');
  accionPendiente = null;
});

// ---- Botón Cancelar venta: activa/desactiva las X ----
btnCancelar.addEventListener('click', () => {
  const activo = lista.classList.toggle('modo-cancelar');
  btnCancelar.classList.toggle('activo', activo);
  btnCancelar.textContent = activo ? 'Salir de cancelar' : 'Cancelar venta';
});

// ---- Inicio y actualización automática cada 15 s ----
cargarPedidos();
setInterval(() => { if (!document.hidden && !ocupado) cargarPedidos(); }, 15000);