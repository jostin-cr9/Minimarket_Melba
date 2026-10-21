const STOCK_BAJO = 5;
const IGV = 0.18;

// La sesión se valida antes de cargar esta página.
const usuarioActual = currentUser();

// ---- Productos de ejemplo (luego vendrán de la BD) ----
let productos = [
  { id: 1, codigo: '7750001', nombre: 'Leche Gloria 1 L',       categoria: 'Lácteos',   precio: 4.80,  stock: 24 },
  { id: 2, codigo: '7750002', nombre: 'Arroz Costeño 1 kg',     categoria: 'Abarrotes', precio: 4.20,  stock: 40 },
  { id: 3, codigo: '7750003', nombre: 'Aceite Primor 1 L',      categoria: 'Abarrotes', precio: 9.50,  stock: 4  },
  { id: 4, codigo: '7750004', nombre: 'Azúcar Rubia 1 kg',      categoria: 'Abarrotes', precio: 3.90,  stock: 18 },
  { id: 5, codigo: '7750005', nombre: 'Inca Kola 1.5 L',        categoria: 'Bebidas',   precio: 7.50,  stock: 3  },
  { id: 6, codigo: '7750006', nombre: 'Pollo entero (kg)',      categoria: 'Carnes',    precio: 11.90, stock: 12 },
  { id: 7, codigo: '7750007', nombre: 'Pan francés (unidad)',   categoria: 'Panadería', precio: 0.30,  stock: 100 },
  { id: 8, codigo: '7750008', nombre: 'Detergente Ariel 500 g', categoria: 'Limpieza',  precio: 6.80,  stock: 5  }
];

let venta = {};              // { idProducto: cantidad }
let nroTransaccion = 1;
let accionPendiente = null;

const $ = id => document.getElementById(id);
const soles = n => 'S/ ' + n.toFixed(2);
const porId = id => productos.find(p => p.id === id);

function msg(texto, ok = false) {
  $('msg').textContent = texto;
  $('msg').classList.toggle('ok', ok);
}

// =====================================
// ENCABEZADO / IDENTIFICACIÓN
// =====================================
$('userCod').textContent = `${usuarioActual.username} · Vendedor`;

function actualizarTx() {
  $('nroTx').textContent = `TX-${new Date().getFullYear()}-${String(nroTransaccion).padStart(4, '0')}`;
}
function actualizarFecha() {
  const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  $('fechaHora').textContent = 'Hoy, ' + hora;
}
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
      <td>${p.nombre}</td>
      <td>${p.categoria}</td>
      <td class="r">${soles(p.precio)}</td>
      <td class="c ${bajo ? 'stock-bajo' : ''}">${p.stock}${bajo ? ' ⚠' : ''}</td>
      <td class="c"><button type="button" class="btn-add" ${p.stock === 0 ? 'disabled' : ''}>Agregar</button></td>`;
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
  const p = porId(id);
  const nueva = (venta[id] || 0) + delta;
  if (nueva <= 0) delete venta[id];
  else if (nueva > p.stock) return msg(`Stock insuficiente de ${p.nombre} (disponible: ${p.stock}).`);
  else venta[id] = nueva;
  msg('');
  render();
}

function totalVenta() {
  return Object.entries(venta).reduce((s, [id, c]) => s + porId(+id).precio * c, 0);
}

function render() {
  const ids = Object.keys(venta);
  const tb = $('tbVenta');
  tb.innerHTML = '';

  if (ids.length === 0) {
    tb.innerHTML = '<tr><td colspan="5" class="vacio">Aún no hay productos en la venta</td></tr>';
  }

  ids.forEach(id => {
    const p = porId(+id);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.nombre}</td>
      <td class="c"><span class="qty">
        <button type="button" data-d="-1">−</button>${venta[id]}<button type="button" data-d="1">+</button>
      </span></td>
      <td class="r">${soles(p.precio)}</td>
      <td class="r sub">${soles(p.precio * venta[id])}</td>
      <td class="c">
        <button type="button" class="btn-del" aria-label="Quitar">
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
  $('alertaStock').innerHTML = '⚠ <b>Stock bajo:</b> ' + bajos.map(p => `${p.nombre} (${p.stock})`).join(', ');
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

// =====================================
// COMPLETAR / CANCELAR
// =====================================
function completarVenta() {
  const total = totalVenta();
  if (total === 0) return msg('Agregue productos a la venta.');
  if ($('pago').value === 'Efectivo' && (parseFloat($('recibido').value) || 0) < total)
    return msg('El monto recibido es menor al total.');

  pedirConfirmacion(`¿Desea completar la venta por ${soles(total)}?`, () => {
    const registro = {
      transaccion: $('nroTx').textContent,
      fecha: new Date().toISOString(),
      vendedor: usuarioActual.username,
      cliente: $('cliente').value.trim() || 'Cliente Genérico (Público General)',
      pago: $('pago').value,
      total,
      items: Object.entries(venta).map(([id, c]) => ({
        producto: porId(+id).nombre, cantidad: c, precio: porId(+id).precio
      }))
    };

    Object.entries(venta).forEach(([id, c]) => { porId(+id).stock -= c; });
    guardarVenta(registro);
    reiniciar();
    renderProductos();                       // refresca los stocks de la tabla
    msg('Venta registrada correctamente.', true);
  });
}

function guardarVenta(registro) {
  // TODO: enviar a la BD (venta, detalle, vendedor) para el dashboard del admin
  console.log('Venta guardada:', registro);
}

function cancelarTransaccion() {
  if (Object.keys(venta).length === 0) return msg('No hay una venta en curso.');
  pedirConfirmacion('¿Desea cancelar la transacción?', () => {
    reiniciar();
    msg('Transacción cancelada.');           // no se guarda en la BD
  });
}

function reiniciar() {
  venta = {};
  nroTransaccion++;
  $('recibido').value = '';
  $('cliente').value = 'Cliente Genérico (Público General)';
  actualizarTx();
  render();
}

$('btnCompletar').addEventListener('click', completarVenta);
$('btnCancelar').addEventListener('click', cancelarTransaccion);
document.addEventListener('keydown', e => {
  if (e.key === 'F10') { e.preventDefault(); completarVenta(); }
});

// ---- Inicio ----
renderProductos();
render();
