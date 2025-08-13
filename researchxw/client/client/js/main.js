// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC46UoGcFS4uimDYIekC1djXmgcDbNJVEs",
    authDomain: "researchx-76c2a.firebaseapp.com",
    projectId: "researchx-76c2a",
    storageBucket: "researchx-76c2a.firebasestorage.app",
    messagingSenderId: "89094669834",
    appId: "1:89094669834:web:90223876b735b804bcc1f3"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Modal functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get modal elements
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const forgotModal = document.getElementById('forgotModal');

    // Get button elements
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const heroSignup = document.getElementById('heroSignup');
    const forgotPassword = document.getElementById('forgotPassword');
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');
    const showLoginFromForgot = document.getElementById('showLoginFromForgot');

    // Get close button elements
    const closeLogin = document.getElementById('closeLogin');
    const closeSignup = document.getElementById('closeSignup');
    const closeForgot = document.getElementById('closeForgot');

    // Function to open modal
    function openModal(modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    // Function to close modal
    function closeModal(modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Event listeners for opening modals
    if (loginBtn) loginBtn.addEventListener('click', () => openModal(loginModal));
    if (signupBtn) signupBtn.addEventListener('click', () => openModal(signupModal));
    if (heroSignup) heroSignup.addEventListener('click', () => openModal(signupModal));

    // Event listeners for closing modals
    if (closeLogin) closeLogin.addEventListener('click', () => closeModal(loginModal));
    if (closeSignup) closeSignup.addEventListener('click', () => closeModal(signupModal));
    if (closeForgot) closeForgot.addEventListener('click', () => closeModal(forgotModal));

    // Event listeners for switching between modals
    if (showSignup) showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(loginModal);
        openModal(signupModal);
    });

    if (showLogin) showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(signupModal);
        openModal(loginModal);
    });

    if (forgotPassword) forgotPassword.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(loginModal);
        openModal(forgotModal);
    });

    if (showLoginFromForgot) showLoginFromForgot.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(forgotModal);
        openModal(loginModal);
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) closeModal(loginModal);
        if (e.target === signupModal) closeModal(signupModal);
        if (e.target === forgotModal) closeModal(forgotModal);
    });
});

// Check if user is logged in
auth.onAuthStateChanged(user => {
    const authButtons = document.querySelector('.auth-buttons');
    if (user) {
        // User is signed in
        authButtons.innerHTML = `
            <button class="btn btn-outline" id="logoutBtn">Logout</button>
            <button class="btn btn-primary" id="dashboardBtn">Dashboard</button>
        `;
        document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());
    } else {
        // No user is signed in
        authButtons.innerHTML = `
            <button class="btn btn-outline" id="loginBtn">Login</button>
            <button class="btn btn-primary" id="signupBtn">Sign Up</button>
        `;
    }
});