// Login Form
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        // Close modal on successful login
        document.getElementById('loginModal').style.display = 'none';
        document.body.style.overflow = 'auto';
    } catch (error) {
        alert(error.message);
    }
});

// Signup Form
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        alert("Passwords don't match!");
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Save additional user data to Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            firstName: document.getElementById('firstName').value,
            middleName: document.getElementById('middleName').value,
            surname: document.getElementById('surname').value,
            institution: document.getElementById('institution').value,
            department: document.getElementById('department').value,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Close modal on successful signup
        document.getElementById('signupModal').style.display = 'none';
        document.body.style.overflow = 'auto';
    } catch (error) {
        alert(error.message);
    }
});

// Forgot Password Form
document.getElementById('forgotForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    
    try {
        await auth.sendPasswordResetEmail(email);
        alert('Password reset email sent!');
        document.getElementById('forgotModal').style.display = 'none';
        document.body.style.overflow = 'auto';
    } catch (error) {
        alert(error.message);
    }
});