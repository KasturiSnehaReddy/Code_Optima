export const api_base_url = "https://code-optima.onrender.com";

export const handleAuthError = (response, data) => {
  // If user not found or invalid token, clear storage and redirect to login
  if (response.status === 401 || 
      (data && (data.error === 'User not found' || 
                data.error === 'Invalid token' || 
                data.error === 'Authentication required'))) {
    localStorage.clear();
    window.location.href = '/login';
    return true;
  }
  return false;
};