document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const checkPlagiarismBtn = document.getElementById('checkPlagiarism');
    const uploadBtn = document.getElementById('uploadBtn');
    const plagiarismResult = document.getElementById('plagiarismResult');
    const uploadStatus = document.getElementById('uploadStatus');

    // Check plagiarism button
    checkPlagiarismBtn?.addEventListener('click', async function() {
        const description = document.getElementById('projectDescription').value;
        
        if (!description || description.length < 100) {
            alert('Please enter at least 100 characters for description');
            return;
        }

        try {
            checkPlagiarismBtn.disabled = true;
            checkPlagiarismBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
            
            // Simulate plagiarism check (replace with actual API call)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Mock result
            plagiarismResult.style.display = 'block';
            plagiarismResult.style.backgroundColor = '#d4edda';
            plagiarismResult.style.color = '#155724';
            plagiarismResult.innerHTML = `
                <i class="fas fa-check-circle"></i> 
                Plagiarism check complete: 95% original content
            `;
            
            uploadBtn.disabled = false;
        } catch (error) {
            plagiarismResult.style.display = 'block';
            plagiarismResult.style.backgroundColor = '#f8d7da';
            plagiarismResult.style.color = '#721c24';
            plagiarismResult.innerHTML = `
                <i class="fas fa-exclamation-circle"></i> 
                Error checking plagiarism: ${error.message}
            `;
        } finally {
            checkPlagiarismBtn.disabled = false;
            checkPlagiarismBtn.innerHTML = '<i class="fas fa-search"></i> Check for Plagiarism';
        }
    });

    // Upload form submission
    uploadForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const user = auth.currentUser;
        if (!user) {
            alert('Please login to upload projects');
            return;
        }

        const fileInput = document.getElementById('projectFile');
        if (!fileInput.files[0]) {
            alert('Please select a file');
            return;
        }

        try {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            
            // Upload file to Firebase Storage
            const file = fileInput.files[0];
            const storageRef = storage.ref(`projects/${user.uid}/${Date.now()}_${file.name}`);
            const uploadTask = storageRef.put(file);
            
            // Monitor upload progress
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    uploadStatus.innerHTML = `Uploading: ${Math.round(progress)}%`;
                },
                (error) => {
                    throw error;
                },
                async () => {
                    // Get download URL
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    
                    // Save project data to Firestore
                    await db.collection('projects').add({
                        title: document.getElementById('projectTitle').value,
                        description: document.getElementById('projectDescription').value,
                        keywords: document.getElementById('projectKeywords').value.split(',').map(k => k.trim()),
                        price: parseFloat(document.getElementById('projectPrice').value),
                        fileUrl: downloadURL,
                        authorId: user.uid,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'pending'
                    });
                    
                    uploadStatus.innerHTML = `
                        <div style="color: var(--success)">
                            <i class="fas fa-check-circle"></i> 
                            Project uploaded successfully!
                        </div>
                    `;
                    
                    // Reset form
                    uploadForm.reset();
                    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Project';
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                }
            );
        } catch (error) {
            uploadStatus.innerHTML = `
                <div style="color: var(--danger)">
                    <i class="fas fa-exclamation-circle"></i> 
                    Upload failed: ${error.message}
                </div>
            `;
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Project';
        }
    });
});