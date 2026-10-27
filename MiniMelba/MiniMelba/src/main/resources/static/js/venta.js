const STOCK_BAJO = 5;
const IGV = 0.18;

// La sesión se valida antes de cargar esta página.
const usuarioActual = currentUser();

// ---- Productos: vienen de la base de datos (API) ----
let productos = [];

let venta = {};              // { idProducto: cantidad }
let codigoTx = '';
let accionPendiente = null;
let ocupado = false;
let pedidoSeleccionado = null;

const $ = id => document.getElementById(id);
const soles = n => 'S/ ' + n.toFixed(2);
const porId = id => productos.find(p => p.id === id);

function lineaVenta(id) {
  const itemPedido = pedidoSeleccionado?.items.find(i => Number(i.productId) === Number(id));
  if (itemPedido) {
    return {
      id: Number(id),
      nombre: itemPedido.name,
      unidad: itemPedido.unit,
      precio: Number(itemPedido.price),
      stock: porId(Number(id))?.stock ?? 0
    };
  }
  const p = porId(Number(id));
  return p ? { ...p, nombre: p.nombre, unidad: '', precio: p.precio } : null;
}

function actualizarModoPedido() {
  const soloLectura = Boolean(pedidoSeleccionado);
  $('buscar').disabled = soloLectura;
  $('cantidad').disabled = soloLectura;
  $('btnAgregar').disabled = soloLectura;
  $('cliente').readOnly = soloLectura;
  $('pago').disabled = soloLectura;
  $('btnCompletar').textContent = soloLectura ? 'Completar pedido' : 'Completar Venta (F10)';
  $('pedidoDetalle').textContent = pedidoSeleccionado
    ? `${pedidoSeleccionado.delivery}${pedidoSeleccionado.address ? ' · ' + pedidoSeleccionado.address : ''} · ${pedidoSeleccionado.payment} · Total: ${soles(Number(pedidoSeleccionado.total))}`
    : '';
}

async function cargarPedidosCliente() {
  const selector = $('pedidoCliente');
  try {
    const [pendientesRes, armadosRes] = await Promise.all([
      fetch('/api/orders?status=pendiente'),
      fetch('/api/orders?status=armado')
    ]);
    if (pendientesRes.status === 401 || armadosRes.status === 401) {
      location.replace('index.html');
      return;
    }
    const [pendientesData, armadosData] = await Promise.all([
      pendientesRes.json(), armadosRes.json()
    ]);
    if (!pendientesRes.ok || !armadosRes.ok) {
      throw new Error(pendientesData.error || armadosData.error || 'No se pudieron cargar los pedidos.');
    }

    const pedidos = [...pendientesData.orders, ...armadosData.orders]
      .sort((a, b) => Number(b.id) - Number(a.id));
    selector.innerHTML = '<option value="">Venta presencial (sin pedido)</option>';
    pedidos.forEach(pedido => {
      const opcion = document.createElement('option');
      opcion.value = pedido.id;
      opcion.textContent = `${pedido.code} · ${pedido.customer} · ${soles(Number(pedido.total))}`;
      selector.appendChild(opcion);
    });
    selector.disabled = false;
  } catch (error) {
    selector.innerHTML = '<option value="">No se pudieron cargar los pedidos</option>';
    selector.disabled = true;
    msg(error.message);
  }
}

function seleccionarPedidoCliente() {
  const id = Number($('pedidoCliente').value);
  if (!id) {
    pedidoSeleccionado = null;
    venta = {};
    $('cliente').value = 'Cliente Genérico (Público General)';
    $('pago').value = 'Efectivo';
    actualizarModoPedido();
    renderProductos();
    render();
    return;
  }

  const todasLasOpciones = [...$('pedidoCliente').options];
  const opcion = todasLasOpciones.find(o => Number(o.value) === id);
  if (!opcion) return;

  cargarDetallePedido(id);
}

async function cargarDetallePedido(id) {
  try {
    const res = await fetch('/api/orders');
    if (res.status === 401) { location.replace('index.html'); return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo cargar el detalle del pedido.');
    const pedido = data.orders.find(o => Number(o.id) === id);
    if (!pedido) throw new Error('El pedido ya no está pendiente o armado. Actualiza la lista.');

    pedidoSeleccionado = pedido;
    venta = Object.fromEntries(pedido.items.map(i => [Number(i.productId), Number(i.quantity)]));
    codigoTx = pedido.code;
    $('cliente').value = pedido.customer;
    $('pago').value = pedido.payment === 'Yape/Plin' ? 'Yape / Plin' : pedido.payment;
    actualizarTx();
    actualizarModoPedido();
    renderProductos();
    render();
    msg('Pedido del cliente cargado.', true);
  } catch (error) {
    pedidoSeleccionado = null;
    $('pedidoCliente').value = '';
    actualizarModoPedido();
    msg(error.message);
  }
}

$('pedidoCliente').addEventListener('change', seleccionarPedidoCliente);

function esc(text) {
  const el = document.createElement('span');
  el.textContent = text ?? '';
  return el.innerHTML;
}

function msg(texto, ok = false) {
  $('msg').textContent = texto;
  $('msg').classList.toggle('ok', ok);
}

async function cargarProductos() {
  const res = await fetch('/api/products');
  if (res.status === 401) {
    location.replace('index.html');
    throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
  }
  if (!res.ok) throw new Error('No se pudo cargar el catálogo.');
  const data = await res.json();
  productos = data.products.map(p => ({
    id: p.id,
    codigo: String(p.code),
    nombre: `${p.name} ${p.unit}`.trim(),
    categoria: p.category,
    precio: Number(p.price),
    stock: Number(p.stock)
  }));
}

// Si el stock cambió, la venta en curso se ajusta a lo disponible
function ajustarVenta() {
  Object.keys(venta).forEach(id => {
    const p = porId(+id);
    if (!p || p.stock <= 0) delete venta[id];
    else if (venta[id] > p.stock) venta[id] = p.stock;
  });
}

async function refrescarProductos() {
  try {
    await cargarProductos();
    ajustarVenta();
  } catch (error) {
    msg(error.message);
  }
  renderProductos();
  render();
}

// =====================================
// ENCABEZADO / IDENTIFICACIÓN
// =====================================
$('userCod').textContent = `${usuarioActual.username} · Vendedor`;

function nuevoCodigoTx() {
  return `TX-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
}
function actualizarTx() {
  $('nroTx').textContent = codigoTx;
}
function actualizarFecha() {
  const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  $('fechaHora').textContent = 'Hoy, ' + hora;
}
codigoTx = nuevoCodigoTx();
actualizarTx();
actualizarFecha();
setInterval(actualizarFecha, 30000);

// =====================================
// PRODUCTOS DISPONIBLES (tabla + búsqueda)
// =====================================
function filtrados(texto) {
  const q = texto.trim().toLowerCase();
  return productos.filter(p =>
    p.nombre.toLowerCase().includes(q) ||
    p.categoria.toLowerCase().includes(q) ||
    p.codigo.includes(q)
  );
}

function renderProductos() {
  const lista = filtrados($('buscar').value);
  const tb = $('tbProductos');
  tb.innerHTML = '';

  if (lista.length === 0) {
    tb.innerHTML = '<tr><td colspan="5" class="vacio">No se encontraron productos</td></tr>';
    return;
  }

  lista.forEach(p => {
    const bajo = p.stock <= STOCK_BAJO;
    const tr = document.createElement('tr');
    if (bajo) tr.className = 'bajo';
    tr.innerHTML = `
      <td>${esc(p.nombre)}</td>
      <td>${esc(p.categoria)}</td>
      <td class="r">${soles(p.precio)}</td>
      <td class="c ${bajo ? 'stock-bajo' : ''}">${p.stock}${bajo ? ' ⚠' : ''}</td>
      <td class="c"><button type="button" class="btn-add" ${p.stock === 0 || pedidoSeleccionado ? 'disabled' : ''}>Agregar</button></td>`;
    tr.querySelector('.btn-add').addEventListener('click', () => agregar(p));
    tb.appendChild(tr);
  });
}

function agregar(p) {
  const cant = Math.max(parseInt($('cantidad').value) || 1, 1);
  const actual = venta[p.id] || 0;
  if (actual + cant > p.stock) return msg(`Stock insuficiente de ${p.nombre} (disponible: ${p.stock}).`);

  venta[p.id] = actual + cant;
  $('cantidad').value = 1;
  msg('');
  render();
}

// Botón rojo "Agregar" y tecla Enter (lector de barras)
function agregarDesdeBusqueda() {
  const texto = $('buscar').value.trim();
  const exacto = productos.find(p => p.codigo === texto);
  const lista = filtrados(texto);
  const p = exacto || (lista.length === 1 ? lista[0] : null);

  if (!p) return msg('Seleccione un producto de la tabla o escriba un nombre/código exacto.');

  agregar(p);
  $('buscar').value = '';
  renderProductos();
  $('buscar').focus();
}

$('buscar').addEventListener('input', renderProductos);
$('buscar').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); agregarDesdeBusqueda(); } });
$('cantidad').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); agregarDesdeBusqueda(); } });
$('btnAgregar').addEventListener('click', agregarDesdeBusqueda);

// =====================================
// DETALLE DE LA VENTA
// =====================================
function cambiarCantidad(id, delta) {
  if (pedidoSeleccionado) return;
  const p = porId(id);
  const nueva = (venta[id] || 0) + delta;
  if (nueva <= 0) delete venta[id];
  else if (nueva > p.stock) return msg(`Stock insuficiente de ${p.nombre} (disponible: ${p.stock}).`);
  else venta[id] = nueva;
  msg('');
  render();
}

function totalVenta() {
  return Object.entries(venta).reduce((s, [id, c]) => s + (lineaVenta(id)?.precio || 0) * c, 0);
}

function render() {
  const ids = Object.keys(venta);
  const tb = $('tbVenta');
  tb.innerHTML = '';

  if (ids.length === 0) {
    tb.innerHTML = '<tr><td colspan="5" class="vacio">Aún no hay productos en la venta</td></tr>';
  }

  ids.forEach(id => {
    const p = lineaVenta(id);
    if (!p) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(p.nombre)}${p.unidad ? ` <small>(${esc(p.unidad)})</small>` : ''}</td>
      <td class="c"><span class="qty">
        <button type="button" data-d="-1" ${pedidoSeleccionado ? 'disabled' : ''}>−</button>${venta[id]}<button type="button" data-d="1" ${pedidoSeleccionado ? 'disabled' : ''}>+</button>
      </span></td>
      <td class="r">${soles(p.precio)}</td>
      <td class="r sub">${soles(p.precio * venta[id])}</td>
      <td class="c">
        <button type="button" class="btn-del" aria-label="Quitar" ${pedidoSeleccionado ? 'disabled' : ''}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
        </button>
      </td>`;
    tr.querySelectorAll('.qty button').forEach(b =>
      b.addEventListener('click', () => cambiarCantidad(+id, +b.dataset.d)));
    tr.querySelector('.btn-del').addEventListener('click', () => {
      delete venta[id];
      render();
    });
    tb.appendChild(tr);
  });

  // Resumen (el precio ya incluye IGV)
  const total = totalVenta();
  const base = total / (1 + IGV);
  $('lineas').textContent = 'Líneas: ' + ids.length;
  $('subtotal').textContent = soles(base);
  $('igv').textContent = soles(total - base);
  $('total').textContent = soles(total);

  calcularVuelto();
  renderAlertaStock();
}

function renderAlertaStock() {
  const bajos = productos.filter(p => p.stock <= STOCK_BAJO);
  $('alertaStock').classList.toggle('oculto', bajos.length === 0);
  $('alertaStock').innerHTML = '⚠ <b>Stock bajo:</b> ' + bajos.map(p => `${esc(p.nombre)} (${p.stock})`).join(', ');
}

// =====================================
// PAGO
// =====================================
function calcularVuelto() {
  const v = (parseFloat($('recibido').value) || 0) - totalVenta();
  $('vuelto').textContent = soles(Math.max(v, 0));
}
$('pago').addEventListener('change', () => {
  $('boxEfectivo').classList.toggle('oculto', $('pago').value !== 'Efectivo');
});
$('recibido').addEventListener('input', calcularVuelto);

// =====================================
// MODAL Sí / No
// =====================================
function pedirConfirmacion(texto, alAceptar) {
  $('modalTexto').textContent = texto;
  accionPendiente = alAceptar;
  $('modal').classList.remove('oculto');
}
$('modalSi').addEventListener('click', () => {
  $('modal').classList.add('oculto');
  if (accionPendiente) accionPendiente();
  accionPendiente = null;
});
$('modalNo').addEventListener('click', () => {
  $('modal').classList.add('oculto');
  accionPendiente = null;
});

// AVISO: VENTA REGISTRADA
function mostrarAviso(codigo) {
  $('avisoCodigo').textContent = codigo;
  $('avisoVenta').classList.remove('oculto');
  $('avisoOk').focus();
}
function cerrarAviso() {
  $('avisoVenta').classList.add('oculto');
  $('buscar').focus();
}
$('avisoOk').addEventListener('click', cerrarAviso);

// =====================================
// COMPLETAR / CANCELAR
// =====================================
function completarVenta() {
  if (ocupado) return;
  const total = totalVenta();
  if (total === 0) return msg('Agregue productos a la venta.');
  if (!pedidoSeleccionado && $('pago').value === 'Efectivo' && (parseFloat($('recibido').value) || 0) < total)
    return msg('El monto recibido es menor al total.');

  pedirConfirmacion(`¿Desea completar la venta por ${soles(total)}?`, registrarVenta);
}

async function registrarVenta() {
  if (ocupado) return;
  ocupado = true;
  if (pedidoSeleccionado) {
    try {
      const res = await fetch(`/api/orders/${pedidoSeleccionado.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completado' })
      });
      if (res.status === 401) { location.replace('index.html'); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo completar el pedido.');

      const codigoPedido = pedidoSeleccionado.code;
      pedidoSeleccionado = null;
      venta = {};
      $('pedidoCliente').value = '';
      $('pago').disabled = false;
      $('cliente').readOnly = false;
      $('cliente').value = 'Cliente Genérico (Público General)';
      $('pago').value = 'Efectivo';
      codigoTx = nuevoCodigoTx();
      actualizarTx();
      actualizarModoPedido();
      await Promise.all([refrescarProductos(), cargarPedidosCliente()]);
      msg('');
      mostrarAviso(codigoPedido);
    } catch (error) {
      msg(error.message);
    } finally {
      ocupado = false;
    }
    return;
  }
  const cuerpo = {
    transactionCode: codigoTx,
    customerName: $('cliente').value.trim() || 'Cliente Genérico (Público General)',
    paymentMethod: $('pago').value === 'Yape / Plin' ? 'Yape/Plin' : $('pago').value,
    items: Object.entries(venta).map(([id, c]) => ({ productId: +id, quantity: c }))
  };

  try {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    });
    if (res.status === 401) { location.replace('index.html'); return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo registrar la venta.');

    reiniciar();
    await refrescarProductos(); // trae los stocks reales de la BD
    msg('');
    mostrarAviso(cuerpo.transactionCode);
  } catch (error) {
    // Conserva el mismo código: si el servidor guardó la venta pero se perdió
    // la respuesta, un reintento debe usar el código original.
    await refrescarProductos();
    msg(error.message);
  } finally {
    ocupado = false;
  }
}

function cancelarTransaccion() {
  if (Object.keys(venta).length === 0) return msg('No hay una venta en curso.');
  pedirConfirmacion('¿Desea cancelar la transacción?', () => {
    reiniciar();
    msg('Transacción cancelada.'); // no se guarda en la BD
  });
}

function reiniciar() {
  venta = {};
  codigoTx = nuevoCodigoTx();
  $('recibido').value = '';
  $('cliente').value = 'Cliente Genérico (Público General)';
  actualizarTx();
  render();
}

$('btnCompletar').addEventListener('click', completarVenta);
$('btnCancelar').addEventListener('click', cancelarTransaccion);
document.addEventListener('keydown', e => {
  const avisoAbierto = !$('avisoVenta').classList.contains('oculto');
  if (e.key === 'F10') { e.preventDefault(); if (!avisoAbierto) completarVenta(); }
  if (e.key === 'Escape' && avisoAbierto) cerrarAviso();
});

// ---- Inicio: carga el catálogo y lo actualiza cada 30 s ----
refrescarProductos();
cargarPedidosCliente();
setInterval(() => { if (!ocupado && !document.hidden) refrescarProductos(); }, 30000);
