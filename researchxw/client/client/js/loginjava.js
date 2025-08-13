<form id="loginForm">
  <input id="email" type="email" required />
  <input id="password" type="password" required />
  <button type="submit">Log in</button>
</form>
<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const json = await res.json();
  if (!res.ok) return alert(json.error || 'Login failed');

  // Store session client-side if you need it later
  localStorage.setItem('sb_session', JSON.stringify(json.session));
  window.location.href = '/dashboard.html';
});
</script>
