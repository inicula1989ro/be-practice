const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const banner = document.getElementById('banner');
const tabBtns = document.querySelectorAll('.tab-btn');

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    if (btn.dataset.tab === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    }
  });
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = registerForm.email.value.trim();
  const password = registerForm.password.value;

  try {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();

    if (!res.ok) throw new Error(body.error?.message || 'Registration failed');

    showBanner(`Account created for ${body.data.email}. You can log in now.`, 'success');
    registerForm.reset();
    document.querySelector('[data-tab="login"]').click();
    loginForm.email.value = email;
  } catch (err) {
    showBanner(err.message, 'error');
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();

    if (!res.ok) throw new Error(body.error?.message || 'Login failed');

    localStorage.setItem('authToken', body.data.token);
    localStorage.setItem('authUser', JSON.stringify(body.data.user));

    window.location.href = '/'; // straight into the store
  } catch (err) {
    if (err.message.includes('Unexpected token') || err.message.includes('JSON')) {
      showBanner('POST /auth/login isn\'t implemented on the server yet.', 'error');
    } else {
      showBanner(err.message, 'error');
    }
  }
});

function showBanner(message, type) {
  banner.textContent = message;
  banner.className = `banner ${type}`;
  setTimeout(() => banner.classList.add('hidden'), 5000);
}

// If a token is already stored, skip the form entirely — go to the store.
if (localStorage.getItem('authToken') && localStorage.getItem('authUser')) {
  window.location.href = '/';
}
