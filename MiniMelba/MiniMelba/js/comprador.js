// =====================================
// MINIMARKET MELBA - VISTA COMPRADOR
// =====================================

// La sesión se valida antes de cargar esta página.
const usuarioActual = currentUser();

// ---- Productos de ejemplo (luego vendrán de la BD) ----
// imagen: '' por ahora; cuando tengas las fotos: 'img/leche.png'
const productos = [
    { id: 1,  nombre: 'Leche Gloria',     unidad: '1 L',    categoria: 'Lácteos',   precio: 4.80,  imagen: 'img/produ/leche-gloria.webp', etiqueta: 'Popular' },
    { id: 2,  nombre: 'Yogurt Gloria',    unidad: '1 L',    categoria: 'Lácteos',   precio: 7.50,  imagen: 'img/produ/yogurt-gloria.webp' },
    { id: 3,  nombre: 'Arroz Costeño',    unidad: '1 kg',   categoria: 'Abarrotes', precio: 4.20,  imagen: 'img/produ/arroz-costeno.webp' },
    { id: 4,  nombre: 'Aceite Primor',    unidad: '1 L',    categoria: 'Abarrotes', precio: 9.50,  imagen: 'img/produ/aceite-primor.webp' },
    { id: 5,  nombre: 'Azúcar Rubia',     unidad: '1 kg',   categoria: 'Abarrotes', precio: 3.90,  imagen: 'img/produ/azucar-rubia.webp' },
    { id: 6,  nombre: 'Inca Kola',        unidad: '1.5 L',  categoria: 'Bebidas',   precio: 7.50,  imagen: 'img/produ/inca-kola.webp', etiqueta: 'Popular' },
    { id: 7,  nombre: 'Agua San Luis',    unidad: '625 ml', categoria: 'Bebidas',   precio: 1.50,  imagen: 'img/produ/agua-san-luis.webp' },
    { id: 8,  nombre: 'Pollo entero',     unidad: '1 kg',   categoria: 'Carnes',    precio: 11.90, imagen: 'img/produ/pollo-entero.webp' },
    { id: 9,  nombre: 'Pan francés',      unidad: '1 und',  categoria: 'Panadería', precio: 0.30,  imagen: 'img/produ/pan-frances.webp', etiqueta: 'Nuevo' },
    { id: 10, nombre: 'Manzana',          unidad: '1 kg',   categoria: 'Frutas',    precio: 6.00,  imagen: 'img/produ/manzana.webp' },
    { id: 11, nombre: 'Plátano de seda',  unidad: '1 kg',   categoria: 'Frutas',    precio: 4.50,  imagen: 'img/produ/platano-seda.webp' },
    { id: 12, nombre: 'Detergente Ariel', unidad: '500 g',  categoria: 'Limpieza',  precio: 6.80,  imagen: 'img/produ/detergente-ariel.webp' }
];

let carrito = {};               // { idProducto: cantidad }
let categoriaActiva = 'Todos';

const $ = id => document.getElementById(id);
const soles = n => 'S/ ' + n.toFixed(2);
const porId = id => productos.find(p => p.id === id);

// =====================================
// INICIALIZACIÓN
// =====================================
document.addEventListener('DOMContentLoaded', () => {
    iniciarUsuario();
    iniciarSwiper();
    iniciarCategoriasPortada();
    renderChips();
    renderProductos();
    renderCarrito();
    iniciarFormularios();
});

// =====================================
// USUARIO / MENÚ
// =====================================
function iniciarUsuario() {
    $('menuUsuario').textContent = usuarioActual.username;
    $('menuRol').textContent = 'Comprador';

    if (usuarioActual.foto) {
        $('avatarLetra').parentElement.style.backgroundImage = `url('${usuarioActual.foto}')`;
    } else {
        $('avatarLetra').textContent = usuarioActual.name[0].toUpperCase();
    }

    $('linkPerfil').addEventListener('click', e => {
        e.preventDefault();
        // TODO: window.location.href = 'perfil.html';
    });
    $('cerrarSesion').addEventListener('click', e => { e.preventDefault(); logout(); });
}

// =====================================
// CARRUSEL SWIPER
// =====================================
function iniciarSwiper() {
    if (typeof Swiper === 'undefined') return;

    new Swiper('.inspirationSwiper', {
        loop: true,
        spaceBetween: 20,
        slidesPerView: 1,
        autoplay: { delay: 3500, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        breakpoints: {
            768: { slidesPerView: 1 },
            992: { slidesPerView: 2 }
        }
    });
}

// =====================================
// CATEGORÍAS DE LA PORTADA -> filtran el catálogo
// =====================================
function iniciarCategoriasPortada() {
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            categoriaActiva = card.dataset.filter;
            renderChips();
            renderProductos();
        });
    });
}

// =====================================
// CATÁLOGO
// =====================================
function renderChips() {
    const cats = ['Todos', ...new Set(productos.map(p => p.categoria))];
    $('chips').innerHTML = '';

    cats.forEach(c => {
        const b = document.createElement('button');
        b.className = 'filter-btn' + (c === categoriaActiva ? ' active' : '');
        b.textContent = c;
        b.addEventListener('click', () => {
            categoriaActiva = c;
            renderChips();
            renderProductos();
        });
        $('chips').appendChild(b);
    });
}

function renderProductos() {
    const q = $('buscar').value.trim().toLowerCase();

    const lista = productos.filter(p =>
        (categoriaActiva === 'Todos' || p.categoria === categoriaActiva) &&
        (p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q))
    );

    $('grid').innerHTML = '';

    lista.forEach(p => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3';
        col.innerHTML = `
            <article class="product-card">
                <div class="product-image">
                    ${p.etiqueta ? `<span class="product-tag ${p.etiqueta === 'Nuevo' ? 'new-tag' : ''}">${p.etiqueta}</span>` : ''}
                    ${p.imagen
                        ? `<img src="${p.imagen}" alt="${p.nombre}">`
                        : '<div class="img-placeholder"><i class="bi bi-basket2"></i></div>'}
                </div>
                <div class="product-info">
                    <span class="product-category">${p.categoria.toUpperCase()}</span>
                    <h3>${p.nombre}</h3>
                    <span class="product-unit">${p.unidad}</span>
                    <div class="product-bottom">
                        <strong>${soles(p.precio)}</strong>
                        <button class="add-cart" aria-label="Agregar al pedido">
                            <i class="bi bi-bag-plus"></i>
                        </button>
                    </div>
                </div>
            </article>`;

        const btn = col.querySelector('.add-cart');
        btn.addEventListener('click', () => {
            agregar(p.id);
            btn.innerHTML = '<i class="bi bi-check-lg"></i>';
            setTimeout(() => { btn.innerHTML = '<i class="bi bi-bag-plus"></i>'; }, 800);
        });

        $('grid').appendChild(col);
    });

    $('sinResultados').classList.toggle('d-none', lista.length > 0);
}

$('buscar').addEventListener('input', renderProductos);

// =====================================
// CARRITO
// =====================================
function agregar(id) {
    carrito[id] = (carrito[id] || 0) + 1;
    mostrarMsg('');
    renderCarrito();
}

function cambiarCantidad(id, delta) {
    const nueva = (carrito[id] || 0) + delta;
    if (nueva <= 0) delete carrito[id];
    else carrito[id] = nueva;
    renderCarrito();
}

function quitar(id) {
    delete carrito[id];
    renderCarrito();
}

function abrirCarrito() {
    $('carrito').classList.add('open');
    $('overlay').classList.add('show');
}

function cerrarCarrito() {
    $('carrito').classList.remove('open');
    $('overlay').classList.remove('show');
}

function totalPedido() {
    return Object.entries(carrito).reduce((s, [id, c]) => s + porId(+id).precio * c, 0);
}

function renderCarrito() {
    const ids = Object.keys(carrito);
    const cont = $('items');
    $('carrito').classList.toggle('vacio', ids.length === 0);

    if (ids.length === 0) {
        cont.innerHTML = `
            <div class="cart-empty">
                <i class="bi bi-cart3"></i>
                <p>Tu carrito está vacío</p>
                <small>Agrega productos para armar tu pedido</small>
            </div>`;
    } else {

        cont.innerHTML = '';
        ids.forEach(id => {
            const p = porId(+id);
            const fila = document.createElement('div');
            fila.className = 'cart-item';
            fila.innerHTML = `
                <div class="cart-item-info">
                    ${p.nombre}
                    <small>${p.unidad} · ${soles(p.precio)} c/u</small>
                </div>
                <div class="quantity-controls">
                    <button type="button" data-d="-1" aria-label="Reducir">−</button>
                    <span>${carrito[id]}</span>
                    <button type="button" data-d="1" aria-label="Aumentar">+</button>
                </div>
                <strong class="item-subtotal">${soles(p.precio * carrito[id])}</strong>
                <button type="button" class="remove-item" aria-label="Quitar">
                    <i class="bi bi-trash"></i>
                </button>`;

            fila.querySelectorAll('.quantity-controls button').forEach(b =>
                b.addEventListener('click', () => cambiarCantidad(+id, +b.dataset.d)));
            fila.querySelector('.remove-item').addEventListener('click', () => quitar(+id));

            cont.appendChild(fila);
        });
    }

    const cantidad = Object.values(carrito).reduce((s, c) => s + c, 0);
    $('contador').textContent = cantidad;
    $('contadorNav').textContent = cantidad;
    $('total').textContent = soles(totalPedido());
}

// =====================================
// FORMULARIOS
// =====================================
function mostrarMsg(texto, tipo = 'error') {
    const colores = { ok: '#267447', error: '#b42318' };
    $('msg').textContent = texto;
    $('msg').style.color = colores[tipo];
}

function iniciarFormularios() {
    $('btnAbrirCarrito').addEventListener('click', abrirCarrito);
    $('btnCerrarCarrito').addEventListener('click', cerrarCarrito);
    $('overlay').addEventListener('click', cerrarCarrito);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarCarrito(); });
    // Mostrar dirección solo para delivery
    $('entrega').addEventListener('change', () => {
        $('boxDireccion').classList.toggle('d-none', $('entrega').value !== 'Delivery');
    });

    // Vaciar pedido
    $('btnVaciar').addEventListener('click', () => {
        carrito = {};
        mostrarMsg('');
        renderCarrito();
    });

    // Confirmar pedido
    $('formPedido').addEventListener('submit', e => {
        e.preventDefault();

        if (Object.keys(carrito).length === 0) return mostrarMsg('Agrega al menos un producto.');
        if (!$('entrega').value) return mostrarMsg('Selecciona el tipo de entrega.');
        if ($('entrega').value === 'Delivery' && !$('direccion').value.trim())
            return mostrarMsg('Ingresa la dirección de entrega.');

        const pedido = {
            cliente: usuarioActual.name,
            fecha: new Date().toISOString(),
            entrega: $('entrega').value,
            direccion: $('entrega').value === 'Delivery' ? $('direccion').value.trim() : '',
            pago: $('pago').value,
            total: totalPedido(),
            items: Object.entries(carrito).map(([id, c]) => ({
                nombre: porId(+id).nombre,
                cantidad: c,
                unidad: porId(+id).unidad,
                precio: porId(+id).precio
            }))
        };

        guardarPedido(pedido);

        carrito = {};
        $('formPedido').reset();
        $('boxDireccion').classList.add('d-none');
        renderCarrito();
        mostrarMsg('¡Pedido enviado! Lo recibirá el vendedor.', 'ok');
    });

    // Suscripción (demostrativa)
    $('formNewsletter').addEventListener('submit', e => {
        e.preventDefault();
        $('mensajeNewsletter').style.color = '#267447';
        $('mensajeNewsletter').textContent = '¡Gracias por suscribirte a Minimarket Melba!';
        e.target.reset();
    });
}

function guardarPedido(pedido) {
    // TODO: enviar a la BD para que aparezca como notificación en la vista del vendedor
    console.log('Pedido enviado:', pedido);
}
