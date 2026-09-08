// Same auth guard as app.js — redirect immediately if there's no session.
const authToken = localStorage.getItem('authToken');

if (!authToken) {
  window.location.href = '/auth.html';
  throw new Error('Not authenticated');
}

const form = document.getElementById('productForm');
const banner = document.getElementById('banner');
const productListEl = document.getElementById('productList');

let products = [];

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    name: form.name.value.trim(),
    category: form.category.value.trim(),
    price: Number(form.price.value),
    stock: Number(form.stock.value),
  };

  try {
    const body = await authFetch('/products', {
      method: 'POST',
      body: payload,
    });

    showBanner(`"${body.data.name}" created successfully.`, 'success');
    form.reset();
    await loadProducts();
  } catch (err) {
    showBanner(err.message, 'error');
  }
});

document.getElementById('refresh').addEventListener('click', loadProducts);

loadProducts();

async function loadProducts() {
  try {
    const res = await fetch('/products'); // public endpoint, no token needed
    const body = await res.json();
    if (!res.ok) throw new Error(body.error?.message || 'Failed to load products');
    products = body.data;
    renderProducts();
  } catch (err) {
    showBanner(err.message, 'error');
  }
}

function renderProducts() {
  productListEl.innerHTML = '';

  if (products.length === 0) {
    productListEl.innerHTML = '<p class="cart-empty">No products yet.</p>';
    return;
  }

  for (const product of products) {
    productListEl.appendChild(renderRow(product));
  }
}

function renderRow(product) {
  const row = document.createElement('div');
  row.className = 'product-row';
  row.innerHTML = `
    <div class="info">
      <span class="name">${product.name}</span>
      <span class="meta">${product.category} · $${Number(product.price).toFixed(2)} · ${product.stock} in stock</span>
    </div>
    <div class="actions">
      <button class="ghost-btn edit-btn">Edit</button>
      <button class="danger-btn delete-btn">Delete</button>
    </div>
  `;

  row.querySelector('.edit-btn').addEventListener('click', () => {
    row.replaceWith(renderEditRow(product));
  });

  row.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(product, row));

  return row;
}

function renderEditRow(product) {
  const row = document.createElement('div');
  row.className = 'product-row editing';
  row.innerHTML = `
    <input class="edit-name" type="text" value="${product.name}" />
    <input class="edit-category" type="text" value="${product.category}" />
    <input class="edit-price" type="number" min="0.01" step="0.01" value="${Number(product.price)}" />
    <input class="edit-stock" type="number" min="0" step="1" value="${product.stock}" />
    <div class="actions">
      <button class="primary-btn save-btn" style="width: auto; padding: 0.4rem 0.8rem;">Save</button>
      <button class="ghost-btn cancel-btn">Cancel</button>
    </div>
  `;

  row.querySelector('.cancel-btn').addEventListener('click', () => {
    row.replaceWith(renderRow(product));
  });

  row.querySelector('.save-btn').addEventListener('click', () => saveProduct(product, row));

  return row;
}

async function saveProduct(product, row) {
  const payload = {
    name: row.querySelector('.edit-name').value.trim(),
    category: row.querySelector('.edit-category').value.trim(),
    price: Number(row.querySelector('.edit-price').value),
    stock: Number(row.querySelector('.edit-stock').value),
  };

  try {
    const body = await authFetch(`/products/${product.id}`, {
      method: 'PATCH',
      body: payload,
    });

    showBanner(`"${body.data.name}" updated.`, 'success');
    const index = products.findIndex((p) => p.id === product.id);
    products[index] = body.data;
    row.replaceWith(renderRow(body.data));
  } catch (err) {
    showBanner(err.message, 'error');
  }
}

async function deleteProduct(product, row) {
  if (!confirm(`Delete "${product.name}"? This can't be undone.`)) return;

  try {
    await authFetch(`/products/${product.id}`, { method: 'DELETE' });
    showBanner(`"${product.name}" deleted.`, 'success');
    products = products.filter((p) => p.id !== product.id);
    row.remove();
  } catch (err) {
    // Most likely a 409 — the product has existing orders and the
    // database's ON DELETE RESTRICT constraint blocked the delete.
    showBanner(err.message, 'error');
  }
}

// Shared helper: attaches the bearer token, JSON-encodes the body, and
// normalizes both the "session expired" and "request failed" cases into
// thrown errors the callers above can catch in one place.
async function authFetch(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.location.href = '/auth.html';
    throw new Error('Session expired');
  }

  const responseBody = method === 'DELETE' && res.status === 204 ? {} : await res.json();

  if (!res.ok) {
    throw new Error(responseBody.error?.message || 'Request failed');
  }

  return responseBody;
}

function showBanner(message, type) {
  banner.textContent = message;
  banner.className = `banner ${type}`;
  setTimeout(() => banner.classList.add('hidden'), 4000);
}
