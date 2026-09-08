// --- Auth guard: run before anything else touches the page ---
const authToken = localStorage.getItem('authToken');
const authUser = JSON.parse(localStorage.getItem('authUser') || 'null');

if (!authToken || !authUser) {
  window.location.href = '/auth.html';
  throw new Error('Not authenticated'); // stop the rest of this script from running
}

const state = {
  products: [],
  cart: loadCart(), // [{ productId, name, price, quantity }]
};

const productGrid = document.getElementById('productGrid');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkout');
const banner = document.getElementById('banner');
const orderHistoryEl = document.getElementById('orderHistory');
const userEmailEl = document.getElementById('userEmail');

userEmailEl.textContent = authUser.email;

document.getElementById('refresh').addEventListener('click', loadProducts);
document.getElementById('loadOrders').addEventListener('click', loadOrders);
document.getElementById('logout').addEventListener('click', logout);
checkoutBtn.addEventListener('click', placeOrder);

init();

async function init() {
  await loadProducts();
  renderCart();
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  window.location.href = '/auth.html';
}

// Wrapper around fetch that attaches the bearer token and treats any 401
// as "session is no longer valid" — covers both a missing token and one
// that has expired since the page loaded.
async function authFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.location.href = '/auth.html';
    throw new Error('Session expired'); // stop the caller from continuing
  }

  return res;
}

async function loadProducts() {
  try {
    // Public endpoint — no token needed, plain fetch is fine here.
    const res = await fetch('/products');
    const body = await res.json();
    if (!res.ok) throw new Error(body.error?.message || 'Failed to load products');
    state.products = body.data;
    renderProducts();
  } catch (err) {
    showBanner(err.message, 'error');
  }
}

function renderProducts() {
  productGrid.innerHTML = '';

  for (const product of state.products) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const stock = Number(product.stock);
    const lowStock = stock > 0 && stock <= 5;
    const outOfStock = stock <= 0;

    card.innerHTML = `
      <span class="category">${product.category}</span>
      <span class="name">${product.name}</span>
      <span class="price">$${Number(product.price).toFixed(2)}</span>
      <span class="stock ${lowStock || outOfStock ? 'low' : ''}">
        ${outOfStock ? 'Out of stock' : `${stock} in stock`}
      </span>
      <div class="add-row">
        <input type="number" min="1" max="${stock}" value="1" ${outOfStock ? 'disabled' : ''} />
        <button class="add-btn" ${outOfStock ? 'disabled' : ''}>Add to cart</button>
      </div>
    `;

    const qtyInput = card.querySelector('input');
    const addBtn = card.querySelector('.add-btn');

    addBtn.addEventListener('click', () => {
      const quantity = Math.max(1, Math.min(stock, Number(qtyInput.value) || 1));
      addToCart(product, quantity);
    });

    productGrid.appendChild(card);
  }
}

function addToCart(product, quantity) {
  const existing = state.cart.find((item) => item.productId === product.id);

  if (existing) {
    existing.quantity += quantity;
  } else {
    state.cart.push({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity,
    });
  }

  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((item) => item.productId !== productId);
  saveCart();
  renderCart();
}

function renderCart() {
  cartItemsEl.innerHTML = '';

  if (state.cart.length === 0) {
    cartItemsEl.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
  }

  let total = 0;

  for (const item of state.cart) {
    total += item.price * item.quantity;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <span class="meta">${item.name} <span class="qty">x${item.quantity}</span></span>
      <span>$${(item.price * item.quantity).toFixed(2)}</span>
      <button aria-label="Remove">&times;</button>
    `;
    row.querySelector('button').addEventListener('click', () => removeFromCart(item.productId));
    cartItemsEl.appendChild(row);
  }

  cartTotalEl.textContent = `$${total.toFixed(2)}`;
  checkoutBtn.disabled = state.cart.length === 0;
}

async function placeOrder() {
  checkoutBtn.disabled = true;

  try {
    const res = await authFetch('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // userId is no longer sent — the server derives it from the token.
        items: state.cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error?.message || 'Order failed');
    }

    showBanner(`Order #${body.data} placed successfully.`, 'success');
    state.cart = [];
    saveCart();
    renderCart();
    await loadProducts(); // refresh stock levels
  } catch (err) {
    showBanner(err.message, 'error');
    checkoutBtn.disabled = state.cart.length === 0;
  }
}

async function loadOrders() {
  try {
    const res = await authFetch(`/users/${authUser.id}/orders`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error?.message || 'Failed to load orders');
    renderOrders(body.data);
  } catch (err) {
    showBanner(err.message, 'error');
  }
}

function renderOrders(rows) {
  orderHistoryEl.innerHTML = '';

  if (rows.length === 0) {
    orderHistoryEl.innerHTML = '<p class="cart-empty">No orders yet.</p>';
    return;
  }

  const orders = new Map();
  for (const row of rows) {
    if (!orders.has(row.order_id)) {
      orders.set(row.order_id, { status: row.status, createdAt: row.created_at, items: [] });
    }
    orders.get(row.order_id).items.push(row);
  }

  for (const [orderId, order] of orders) {
    const card = document.createElement('div');
    card.className = 'order-card';

    const lines = order.items
      .map(
        (item) =>
          `<div class="order-line"><span>${item.product_name} x${item.quantity}</span><span>$${(
            item.quantity * Number(item.unit_price)
          ).toFixed(2)}</span></div>`
      )
      .join('');

    card.innerHTML = `
      <div class="order-head"><span>Order #${orderId}</span><span>${order.status}</span></div>
      ${lines}
    `;

    orderHistoryEl.appendChild(card);
  }
}

function showBanner(message, type) {
  banner.textContent = message;
  banner.className = `banner ${type}`;
  setTimeout(() => banner.classList.add('hidden'), 4000);
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem('cart')) || [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
}
