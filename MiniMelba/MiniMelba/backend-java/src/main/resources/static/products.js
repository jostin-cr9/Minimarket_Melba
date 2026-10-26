const form = document.querySelector('#product-form');
const rows = document.querySelector('#products');
const message = document.querySelector('#message');
const fields = ['code', 'name', 'category', 'unit', 'price', 'stock', 'image'];

function showMessage(text) { message.textContent = text; }

async function request(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `La solicitud falló (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

async function loadProducts() {
  try {
    const products = await request('/api/products');
    rows.replaceChildren();
    for (const product of products) {
      const row = document.createElement('tr');
      const values = [product.code, product.name, product.category, `S/ ${Number(product.price).toFixed(2)}`, product.stock];
      for (const value of values) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      const actions = document.createElement('td');
      actions.className = 'actions-cell';
      const edit = document.createElement('button');
      edit.textContent = 'Editar';
      edit.addEventListener('click', () => editProduct(product));
      const remove = document.createElement('button');
      remove.textContent = 'Desactivar';
      remove.className = 'danger';
      remove.addEventListener('click', () => deactivateProduct(product.id));
      actions.append(edit, remove);
      row.append(actions);
      rows.append(row);
    }
  } catch (error) { showMessage(error.message); }
}

function editProduct(product) {
  document.querySelector('#product-id').value = product.id;
  for (const field of fields) document.querySelector(`#${field}`).value = product[field] ?? '';
  document.querySelector('#form-title').textContent = 'Editar producto';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const id = document.querySelector('#product-id').value;
  const product = Object.fromEntries(fields.map(field => [field, document.querySelector(`#${field}`).value]));
  product.price = Number(product.price);
  product.stock = Number(product.stock);
  product.image ||= null;
  try {
    await request(id ? `/api/products/${id}` : '/api/products', {
      method: id ? 'PUT' : 'POST', body: JSON.stringify(product)
    });
    form.reset();
    document.querySelector('#product-id').value = '';
    document.querySelector('#unit').value = 'unidad';
    document.querySelector('#form-title').textContent = 'Nuevo producto';
    showMessage('Producto guardado.');
    await loadProducts();
  } catch (error) { showMessage(error.message); }
});

document.querySelector('#cancel-edit').addEventListener('click', () => {
  document.querySelector('#product-id').value = '';
  document.querySelector('#form-title').textContent = 'Nuevo producto';
});

async function deactivateProduct(id) {
  if (!window.confirm('¿Desactivar este producto?')) return;
  try {
    await request(`/api/products/${id}`, { method: 'DELETE' });
    showMessage('Producto desactivado.');
    await loadProducts();
  } catch (error) { showMessage(error.message); }
}

loadProducts();
