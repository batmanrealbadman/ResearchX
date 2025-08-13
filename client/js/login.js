async function login(email, password) {
    try {
        const response = await fetch('http://localhost:3000/server/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            alert('Login successful!');
            window.location.href = '/dashboard.html';
        } else {
            alert('Login failed: ' + data.error);
        }
    } catch (err) {
        console.error('Login error:', err);
        alert('An error occurred during login.');
    }
}
