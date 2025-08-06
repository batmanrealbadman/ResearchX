document.addEventListener('DOMContentLoaded', function() {
    // Initialize payment functionality
    const paymentSelect = document.getElementById('payment');
    const downloadBtn = document.querySelector('.feature-card[href="#"]');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const user = auth.currentUser;
            
            if (!user) {
                alert('Please login to download projects');
                document.getElementById('loginModal').style.display = 'flex';
                return;
            }
            
            const price = paymentSelect.value;
            alert(`Redirecting to payment gateway for ₦${price} payment`);
            // In a real app, you would redirect to your payment endpoint
            // window.location.href = `/.netlify/functions/server/payment?amount=${price}`;
        });
    }
    
    // Load projects (example)
    async function loadProjects() {
        try {
            const snapshot = await db.collection('projects')
                .where('status', '==', 'approved')
                .limit(10)
                .get();
            
            // Process and display projects here
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }
    
    loadProjects();
});