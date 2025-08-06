/**
 * Authentication and Project Upload Handler
 * Enhanced with better security, error handling, and user feedback
 */

// Constants
const API_BASE_URL = '/.netlify/functions/server';
const TOKEN_KEY = 'researchx_token';
const TOKEN_EXPIRY_KEY = 'researchx_token_expiry';
const TOKEN_EXPIRY_DAYS = 7; // Token expiry in days

// Helper function for API requests
async function makeRequest(url, method, body = null, requiresAuth = true) {
  const headers = {
    'Content-Type': body instanceof FormData ? undefined : 'application/json'
  };

  if (requiresAuth) {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers,
    body: body instanceof FormData ? body : (body ? JSON.stringify(body) : null)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// Token management
function storeToken(token) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + TOKEN_EXPIRY_DAYS);
  
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryDate.toISOString());
}

function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  if (!token || !expiry || new Date(expiry) < new Date()) {
    clearToken();
    return null;
  }
  
  return token;
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

// User Signup
async function signup(userData) {
  try {
    // Basic client-side validation
    if (!userData.email || !userData.password || !userData.name) {
      throw new Error('Please fill in all required fields');
    }

    if (userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const data = await makeRequest('/auth/signup', 'POST', userData, false);

    if (data.success && data.token) {
      storeToken(data.token);
      showSuccessNotification('Account created successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1500);
    } else {
      throw new Error(data.error || 'Signup failed');
    }
  } catch (error) {
    console.error('Signup error:', error);
    showErrorNotification(error.message || 'An error occurred during signup');
  }
}

// Project Upload
async function uploadProject(projectData, file) {
  try {
    // Validate project data
    if (!projectData.title || !projectData.description) {
      throw new Error('Title and description are required');
    }

    if (!file) {
      throw new Error('Please select a file to upload');
    }

    // Validate file type and size
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Only PDF, DOC, and DOCX files are allowed');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File size must be less than 10MB');
    }

    // Show loading state
    const uploadButton = document.getElementById('uploadButton');
    const originalText = uploadButton.innerHTML;
    uploadButton.disabled = true;
    uploadButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';

    // Create project record
    const projectResult = await makeRequest('/projects', 'POST', projectData);
    
    if (!projectResult.success || !projectResult.projectId) {
      throw new Error(projectResult.error || 'Failed to create project');
    }

    // Upload file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectResult.projectId);

    const uploadResult = await makeRequest(`/upload/project/${projectResult.projectId}`, 'POST', formData);

    if (uploadResult.success) {
      showSuccessNotification('Project uploaded successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = '/projects.html';
      }, 1500);
    } else {
      throw new Error(uploadResult.error || 'File upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showErrorNotification(error.message || 'Upload failed');
    
    // Reset button state
    const uploadButton = document.getElementById('uploadButton');
    if (uploadButton) {
      uploadButton.disabled = false;
      uploadButton.innerHTML = originalText;
    }
  }
}

// Notification helpers
function showSuccessNotification(message) {
  // Replace with your preferred notification system
  const notification = document.createElement('div');
  notification.className = 'alert alert-success position-fixed top-0 end-0 m-3';
  notification.style.zIndex = '9999';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function showErrorNotification(message) {
  // Replace with your preferred notification system
  const notification = document.createElement('div');
  notification.className = 'alert alert-danger position-fixed top-0 end-0 m-3';
  notification.style.zIndex = '9999';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Export functions for use in other modules
export {
  signup,
  uploadProject,
  getToken,
  clearToken,
  makeRequest
};