const user = currentUser();
const productsKey = 'melba_admin_products';
const salesKey = 'melba_sales';
const usersKey = 'melba_users';
const initialProducts = [
  {id:1,code:'7750001',name:'Leche Gloria 1 L',category:'Lácteos',price:4.8,stock:24,image:'img/produ/leche-gloria.webp'},
  {id:2,code:'7750002',name:'Arroz Costeño 1 kg',category:'Abarrotes',price:4.2,stock:40,image:'img/produ/arroz-costeno.webp'},
  {id:3,code:'7750003',name:'Aceite Primor 1 L',category:'Abarrotes',price:9.5,stock:4,image:'img/produ/aceite-primor.webp'},
  {id:4,code:'7750004',name:'Azúcar Rubia 1 kg',category:'Abarrotes',price:3.9,stock:18,image:'img/produ/azucar-rubia.webp'},
  {id:5,code:'7750005',name:'Inca Kola 1.5 L',category:'Bebidas',price:7.5,stock:3,image:'img/produ/inca-kola.webp'},
  {id:6,code:'7750006',name:'Pollo entero (kg)',category:'Carnes',price:11.9,stock:12,image:'img/produ/pollo-entero.webp'},
  {id:7,code:'7750007',name:'Pan francés (unidad)',category:'Panadería',price:.3,stock:100,image:'img/produ/pan-frances.webp'},
  {id:8,code:'7750008',name:'Detergente Ariel 500 g',category:'Limpieza',price:6.8,stock:5,image:'img/produ/detergente-ariel.webp'}
];
let products = JSON.parse(localStorage.getItem(productsKey) || 'null') || initialProducts;
const $ = id => document.getElementById(id);
const money = n => 'S/ ' + Number(n).toFixed(2);
const read = key => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
function saveProducts(){localStorage.setItem(productsKey,JSON.stringify(products));}
function safe(text){const el=document.createElement('span');el.textContent=text ?? '';return el.innerHTML;}
function navigate(view){document.querySelectorAll('.view').forEach(el=>el.classList.toggle('hidden',el.id!==`view-${view}`));document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));$('pageTitle').textContent={inicio:'Resumen',productos:'Productos e inventario',ventas:'Ventas',usuarios:'Usuarios'}[view];if(view==='ventas')renderSales();if(view==='usuarios')renderUsers();}
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.view)));
document.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.go)));
function renderHome(){const low=products.filter(p=>p.stock<=5);$('statProducts').textContent=products.length;$('statStock').textContent=products.reduce((n,p)=>n+Number(p.stock),0);$('statSales').textContent=read(salesKey).length;$('statLow').textContent=low.length;$('lowStockRows').innerHTML=low.length?low.map(p=>`<tr><td>${safe(p.name)}</td><td>${safe(p.category)}</td><td class="low">${p.stock}</td><td>${money(p.price)}</td></tr>`).join(''):'<tr><td class="empty" colspan="4">No hay productos con stock bajo.</td></tr>';}
function renderProducts(){const q=$('searchProducts').value.trim().toLowerCase();const list=products.filter(p=>`${p.name} ${p.code} ${p.category}`.toLowerCase().includes(q));$('productCount').textContent=`${list.length} productos`;$('productRows').innerHTML=list.length?list.map(p=>`<tr><td>${safe(p.code)}</td><td><b>${safe(p.name)}</b></td><td>${safe(p.category)}</td><td>${money(p.price)}</td><td class="${p.stock<=5?'low':''}">${p.stock}${p.stock<=5?' ⚠':''}</td><td><button class="action" data-edit="${p.id}">Editar</button><button class="action delete" data-delete="${p.id}">Eliminar</button></td></tr>`).join(''):'<tr><td class="empty" colspan="6">No hay productos para mostrar.</td></tr>';document.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openEdit(+b.dataset.edit)));document.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>removeProduct(+b.dataset.delete)));}
function openEdit(id){const p=products.find(x=>x.id===id);$('dialogTitle').textContent=p?'Editar producto':'Nuevo producto';$('editId').value=p?.id||'';$('pCode').value=p?.code||'';$('pName').value=p?.name||'';$('pCategory').value=p?.category||'';$('pPrice').value=p?.price||'';$('pStock').value=p?.stock??'';$('pImage').value=p?.image||'';$('productDialog').showModal();}
function closeDialog(){$('productDialog').close();}
function removeProduct(id){const p=products.find(x=>x.id===id);if(!p||!confirm(`¿Eliminar ${p.name} del catálogo?`))return;products=products.filter(x=>x.id!==id);saveProducts();refresh();}
function renderSales(){const rows=read(salesKey);$('salesRows').innerHTML=rows.length?rows.slice().reverse().map(s=>`<tr><td>${safe(s.transaccion)}</td><td>${safe(new Date(s.fecha).toLocaleString('es-CO'))}</td><td>${safe(s.vendedor)}</td><td>${safe(s.cliente)}</td><td>${safe(s.pago)}</td><td><b>${money(s.total)}</b></td></tr>`).join(''):'<tr><td class="empty" colspan="6">Aún no hay ventas registradas desde la caja.</td></tr>';}
function renderUsers(){const rows=read(usersKey);$('userRows').innerHTML=rows.length?rows.map(u=>`<tr><td>${safe(u.name)}</td><td>${safe(u.username)}</td><td>${u.role==='admin'?'Administrador':u.role==='vendedor'?'Vendedor':'Comprador'}</td></tr>`).join(''):'<tr><td class="empty" colspan="3">No hay cuentas registradas.</td></tr>';}
function refresh(){renderHome();renderProducts();}
$('adminName').textContent=user.name;$('welcomeName').textContent=user.name;$('avatar').textContent=(user.name||user.username)[0].toUpperCase();
$('newProduct').addEventListener('click',()=>openEdit(null));$('closeDialog').addEventListener('click',closeDialog);$('cancelDialog').addEventListener('click',closeDialog);$('searchProducts').addEventListener('input',renderProducts);
$('productForm').addEventListener('submit',e=>{e.preventDefault();const id=$('editId').value;const item={id:id?Number(id):Math.max(12,...products.map(p=>p.id))+1,code:$('pCode').value.trim(),name:$('pName').value.trim(),category:$('pCategory').value.trim(),price:Number($('pPrice').value),stock:Number($('pStock').value),image:$('pImage').value.trim()};if(products.some(p=>p.code.toLowerCase()===item.code.toLowerCase()&&p.id!==item.id)){alert('Ya existe un producto con ese código.');return;}products=id?products.map(p=>p.id===item.id?item:p):[...products,item];saveProducts();closeDialog();refresh();});
$('logout').addEventListener('click',logout);
refresh();
