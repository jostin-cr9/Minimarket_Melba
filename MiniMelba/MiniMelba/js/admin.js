const user = currentUser();
let products = [];
let summary = { productCount: 0, stockUnits: 0, saleCount: 0, lowStockCount: 0 };
let lowStock = [];

const $ = id => document.getElementById(id);
const money = n => 'S/ ' + Number(n).toFixed(2);
const ROLES = { admin: 'Administrador', vendedor: 'Vendedor', comprador: 'Comprador' };

function safe(text) {
  const el = document.createElement('span');
  el.textContent = text ?? '';
  return el.innerHTML;
}

// Llama a la API cuando la sesion vence
async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (res.status === 401) { location.replace('index.html'); throw new Error('Sesión expirada.'); }
  let data = {};
  if (res.status !== 204) { try { data = await res.json(); } catch { } }
  if (!res.ok) throw new Error(data.error || 'Ocurrió un error. Intenta nuevamente.');
  return data;
}

//  Navegación 
const TITLES = { inicio: 'Resumen', productos: 'Productos e inventario', ventas: 'Ventas', pedidos: 'Pedidos', reportes: 'Reportes', usuarios: 'Usuarios' };

function navigate(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('hidden', el.id !== `view-${view}`));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  $('pageTitle').textContent = TITLES[view];
  if (view === 'ventas') renderSales();
    if (view === 'pedidos') renderOrders();
  if (view === 'reportes') loadReport();
  if (view === 'usuarios') renderUsers();
}
document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.view)));
document.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.go)));

//  Resumen 
async function renderHome() {
  const data = await api('/api/admin/summary');
  summary = data.summary;
  lowStock = data.lowStock;
  $('statProducts').textContent = summary.productCount;
  $('statStock').textContent = summary.stockUnits;
  $('statSales').textContent = summary.saleCount;
  $('statLow').textContent = summary.lowStockCount;
  $('lowStockRows').innerHTML = lowStock.length
    ? lowStock.map(p => `<tr><td>${safe(p.name)}</td><td>${safe(p.category)}</td><td class="low">${p.stock}</td><td>${money(p.price)}</td></tr>`).join('')
    : '<tr><td class="empty" colspan="4">No hay productos con stock bajo.</td></tr>';
}

//  Productos 
async function loadProducts() {
  products = (await api('/api/products')).products;
}

function renderProducts() {
  const q = $('searchProducts').value.trim().toLowerCase();
  const list = products.filter(p => `${p.name} ${p.code} ${p.category}`.toLowerCase().includes(q));
  $('productCount').textContent = `${list.length} productos`;
  $('productRows').innerHTML = list.length
    ? list.map(p => `<tr>
        <td>${safe(p.code)}</td>
        <td><b>${safe(p.name)}</b> <small>${safe(p.unit)}</small></td>
        <td>${safe(p.category)}</td>
        <td>${money(p.price)}</td>
        <td class="${p.stock <= 5 ? 'low' : ''}">${p.stock}${p.stock <= 5 ? ' ⚠' : ''}</td>
        <td><button class="action" data-edit="${p.id}">Editar</button><button class="action delete" data-delete="${p.id}">Eliminar</button></td>
      </tr>`).join('')
    : '<tr><td class="empty" colspan="6">No hay productos para mostrar.</td></tr>';
  document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openEdit(+b.dataset.edit)));
  document.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => removeProduct(+b.dataset.delete)));
}

function openEdit(id) {
  const p = products.find(x => x.id === id);
  $('dialogTitle').textContent = p ? 'Editar producto' : 'Nuevo producto';
  $('editId').value = p?.id || '';
  $('pCode').value = p?.code || '';
  $('pName').value = p?.name || '';
  $('pCategory').value = p?.category || '';
  $('pPrice').value = p?.price || '';
  $('pStock').value = p?.stock ?? '';
  $('pImage').value = p?.image || '';
  $('productDialog').showModal();
}
function closeDialog() { $('productDialog').close(); }

async function removeProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p || !confirm(`¿Eliminar ${p.name} del catálogo?`)) return;
  try {
    await api(`/api/products/${id}`, { method: 'DELETE' });
    await refresh();
  } catch (error) { alert(error.message); }
}

$('productForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('editId').value;
  const existing = id ? products.find(p => p.id === Number(id)) : null;
  const item = {
    code: $('pCode').value.trim(),
    name: $('pName').value.trim(),
    category: $('pCategory').value.trim(),
    unit: existing?.unit || 'unidad',
    price: Number($('pPrice').value),
    stock: Number($('pStock').value),
    image: $('pImage').value.trim() || null
  };
  try {
    if (id) await api(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(item) });
    else await api('/api/products', { method: 'POST', body: JSON.stringify(item) });
    closeDialog();
    await refresh();
  } catch (error) { alert(error.message); }
});

//  Ventas 
async function renderSales() {
  try {
    const { sales } = await api('/api/admin/sales');
    $('salesRows').innerHTML = sales.length
      ? sales.map(s => `<tr><td>${safe(s.transaccion)}</td><td>${safe(new Date(s.fecha).toLocaleString('es-PE'))}</td><td>${safe(s.vendedor)}</td><td>${safe(s.cliente)}</td><td>${safe(s.pago)}</td><td><b>${money(s.total)}</b></td></tr>`).join('')
      : '<tr><td class="empty" colspan="6">Aún no hay ventas registradas desde la caja.</td></tr>';
  } catch (error) { alert(error.message); }
}

//  Usuarios 
async function renderUsers() {
  try {
    const { users } = await api('/api/admin/users');
    $('userRows').innerHTML = users.length
      ? users.map(u => `<tr><td>${safe(u.name)}</td><td>${safe(u.username)}</td><td>${ROLES[u.role] || safe(u.role)}</td></tr>`).join('')
      : '<tr><td class="empty" colspan="3">No hay cuentas registradas.</td></tr>';
  } catch (error) { alert(error.message); }
}
// Reportes
let reportRange = 'day';

async function loadReport() {
  const pedido = reportRange;
  try {
    const r = await api(`/api/admin/reports?range=${pedido}`);
    if (pedido !== reportRange) return; // llegó una respuesta vieja, se ignora
    $('repVentas').textContent = r.resumen.ventas;
    $('repUnidades').textContent = r.resumen.unidades;
    $('repTotal').textContent = money(r.resumen.total);
    $('repLabel').textContent = r.label;
    $('reportInfo').textContent = `Período: ${r.label} · desde ${new Date(r.since).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}`;

    $('topProductRows').innerHTML = r.productos.length
      ? r.productos.map((p, i) => `<tr><td>${i + 1}</td><td><b>${safe(p.producto)}</b></td><td>${p.unidades}</td><td>${money(p.monto)}</td></tr>`).join('')
      : '<tr><td class="empty" colspan="4">Sin ventas en este período.</td></tr>';

    $('sellerRows').innerHTML = r.vendedores.length
      ? r.vendedores.map(v => `<tr><td><b>${safe(v.vendedor)}</b></td><td>${safe(v.username)}</td><td>${v.ventas}</td><td>${money(v.total)}</td></tr>`).join('')
      : '<tr><td class="empty" colspan="4">Sin ventas en este período.</td></tr>';

    $('dayRows').innerHTML = r.porDia.length
      ? [...r.porDia].reverse().map(d => `<tr><td>${safe(d.dia.split('-').reverse().join('/'))}</td><td>${d.ventas}</td><td>${money(d.total)}</td></tr>`).join('')
      : '<tr><td class="empty" colspan="3">Sin ventas en este período.</td></tr>';
  } catch (error) { alert(error.message); }
}

async function descargarExcel() {
  const btn = $('btnExcel');
  btn.disabled = true;
  btn.textContent = 'Generando...';
  try {
    const res = await fetch(`/api/admin/reports/excel?range=${reportRange}`);
    if (res.status === 401) { location.replace('index.html'); return; }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'No se pudo generar el Excel.');
    }
    const blob = await res.blob();
    const nombre = (res.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/)?.[1] || `reporte-ventas-${reportRange}.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) { alert(error.message); }
  finally {
    btn.disabled = false;
    btn.textContent = '⬇ Generar Excel';
  }
}

document.querySelectorAll('.range-btn').forEach(b => b.addEventListener('click', () => {
  reportRange = b.dataset.range;
  document.querySelectorAll('.range-btn').forEach(x => x.classList.toggle('active', x === b));
  loadReport();
}));
$('btnExcel').addEventListener('click', descargarExcel);
//  Inicio
//  Pedidos 
const ORDER_STATES = { pendiente: 'Pendiente', armado: 'Armado', completado: 'Completado', cancelado: 'Cancelado' };

async function renderOrders() {
  try {
    const status = $('orderStatus').value;
    const { orders } = await api('/api/orders' + (status ? `?status=${encodeURIComponent(status)}` : ''));
    $('orderCount').textContent = `${orders.length} pedidos`;
    $('orderRows').innerHTML = orders.length
      ? orders.map(o => {
          const fecha = new Date(o.createdAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
          const items = o.items.map(i => `<li>${Number(i.quantity)} × ${safe(i.name)} <small>(${safe(i.unit)})</small> — ${money(Number(i.price) * Number(i.quantity))}</li>`).join('');
          return `<tr>
              <td><b>${safe(o.code)}</b></td>
              <td>${safe(fecha)}</td>
              <td>${safe(o.customer)}</td>
              <td>${safe(o.delivery)}</td>
              <td>${safe(o.payment)}</td>
              <td><span class="order-status st-${safe(o.status)}">${safe(ORDER_STATES[o.status] || o.status)}</span></td>
              <td><b>${money(o.total)}</b></td>
              <td><button class="action" data-detail="${o.id}">Detalle</button></td>
            </tr>
            <tr class="order-detail" id="detail-${o.id}">
              <td colspan="8">
                <ul>${items}</ul>
                ${o.address ? `<p><b>Dirección:</b> ${safe(o.address)}</p>` : ''}
              </td>
            </tr>`;
        }).join('')
      : '<tr><td class="empty" colspan="8">No hay pedidos para mostrar.</td></tr>';
    document.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => {
      $(`detail-${b.dataset.detail}`).classList.toggle('open');
    }));
  } catch (error) { alert(error.message); }
}
$('orderStatus').addEventListener('change', renderOrders);
$('refreshOrders').addEventListener('click', renderOrders); 
async function refresh() {
  await Promise.all([loadProducts(), renderHome()]);
  renderProducts();
}

$('adminName').textContent = user.name;
$('welcomeName').textContent = user.name;
$('avatar').textContent = (user.name || user.username)[0].toUpperCase();
$('newProduct').addEventListener('click', () => openEdit(null));
$('closeDialog').addEventListener('click', closeDialog);
$('cancelDialog').addEventListener('click', closeDialog);
$('searchProducts').addEventListener('input', renderProducts);
$('logout').addEventListener('click', logout);

refresh().catch(error => alert(error.message));