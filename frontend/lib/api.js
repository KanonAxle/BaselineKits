// Utility functions for calling the backend API

// Use the same-origin Vercel service route by default; local development can override this URL.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Decode a JWT payload and check if it's expired (no signature verification — client-side only)
function jwtExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return !payload.exp || Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

// Get auth token from localStorage — returns null and clears if expired
export function getToken() {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  if (token && jwtExpired(token)) {
    localStorage.removeItem('token');
    return null;
  }
  return token;
}

// Save token after login/register
export function saveToken(token) {
  localStorage.setItem('token', token);
}

// Remove token on logout
export function removeToken() {
  localStorage.removeItem('token');
}

// Admin token (separate from user token)
export function getAdminToken() {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('adminToken');
  if (token && jwtExpired(token)) {
    localStorage.removeItem('adminToken');
    return null;
  }
  return token;
}

export function saveAdminToken(token) {
  localStorage.setItem('adminToken', token);
}

export function removeAdminToken() {
  localStorage.removeItem('adminToken');
}

// Base fetch wrapper (uses user token)
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });

  if (res.status === 401) removeToken();

  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Request failed (${res.status} ${res.statusText}): ${text}`);
  }

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Admin fetch wrapper (uses admin token)
async function adminFetch(path, options = {}) {
  const token = getAdminToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });

  if (res.status === 401) removeAdminToken();

  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Admin request failed (${res.status} ${res.statusText}): ${text}`);
  }

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Auth
export const register = (email, password, name, phone_number = '', billing_address = null, mailing_address = null, next = '/account') =>
  apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, phone_number, billing_address, mailing_address, next })
  });

export const login = (email, password, rememberMe = false, next = '/account') =>
  apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, rememberMe, next }) });

export const resendVerificationEmail = (email, next = '/account') =>
  apiFetch('/auth/email/verification/resend', { method: 'POST', body: JSON.stringify({ email, next }) });

export const verifyEmail = (token) =>
  apiFetch('/auth/email/verify', { method: 'POST', body: JSON.stringify({ token }) });

export const requestPasswordReset = (email, next = '/account') =>
  apiFetch('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email, next }) });

export const completePasswordReset = (token, password) =>
  apiFetch('/auth/password-reset/complete', { method: 'POST', body: JSON.stringify({ token, password }) });

export const getMe = () => apiFetch('/auth/me');

export const updateProfile = (updates) =>
  apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(updates) });

// Products
export const getProducts = () => apiFetch('/products');
export const getProduct = (id) => apiFetch(`/products/${id}`);
export const adminGetProducts = () => adminFetch('/admin/products');

// Education
export const getEducation = () => apiFetch('/education');
export const adminGetEducation = () => adminFetch('/admin/education');
const eduBody = (data) => ({ body: JSON.stringify(data) });
export const adminCreateEducationCategory = (data) => adminFetch('/admin/education/categories', { method: 'POST', ...eduBody(data) });
export const adminUpdateEducationCategory = (id, data) => adminFetch(`/admin/education/categories/${id}`, { method: 'PUT', ...eduBody(data) });
export const adminDeleteEducationCategory = (id) => adminFetch(`/admin/education/categories/${id}`, { method: 'DELETE' });
export const adminCreateEducationArticle = (data) => adminFetch('/admin/education/articles', { method: 'POST', ...eduBody(data) });
export const adminUpdateEducationArticle = (slug, data) => adminFetch(`/admin/education/articles/${slug}`, { method: 'PUT', ...eduBody(data) });
export const adminDeleteEducationArticle = (slug) => adminFetch(`/admin/education/articles/${slug}`, { method: 'DELETE' });

// Kits
export const getKits = () => apiFetch('/kits');
export const getKit = (id) => apiFetch(`/kits/${id}`);

// Q&A
export const getQuestions = () => apiFetch('/qa/questions');
export const getAnswers = (questionId) => apiFetch(`/qa/questions/${questionId}/answers`);
export const getStartQuestion = () => apiFetch('/qa/start');
export const getQuestion = (id) => apiFetch(`/qa/questions/${id}`);
export const submitQuiz = (answers) =>
  apiFetch('/qa/submit', { method: 'POST', body: JSON.stringify({ answers }) });

// Orders require an authenticated account; marketing consent is optional.
export const createOrder = (kit_id, customizations, shipping_address, shipping_country, phone_number, terms_accepted, marketing_opt_in) =>
  apiFetch('/orders', { method: 'POST', body: JSON.stringify({ kit_id, customizations, shipping_address, shipping_country, phone_number, terms_accepted, marketing_opt_in }) });

export const getOrders = () => apiFetch('/orders');

// Public order lookup — no auth needed; email is optional but recommended for verification
export const lookupOrder = (order_id, email) =>
  apiFetch(`/orders/lookup/${order_id}${email ? `?email=${encodeURIComponent(email)}` : ''}`);

export const autocompleteGoogleAddress = (input, sessionToken) =>
  apiFetch('/address/google/autocomplete', {
    method: 'POST',
    body: JSON.stringify({ input, sessionToken }),
  });

export const getGoogleAddressDetails = (placeId, sessionToken) =>
  apiFetch('/address/google/details', {
    method: 'POST',
    body: JSON.stringify({ placeId, sessionToken }),
  });

// Checkout
export const createCheckout = (order_id, success_url, cancel_url) =>
  apiFetch('/checkout', { method: 'POST', body: JSON.stringify({ order_id, success_url, cancel_url }) });

// Cart order — creates an order from an array of CartItem objects (products and/or kits)
export const createCartOrder = (items, shipping_address, shipping_country, phone_number, terms_accepted, marketing_opt_in) =>
  apiFetch('/orders/from-cart', { method: 'POST', body: JSON.stringify({ items, shipping_address, shipping_country, phone_number, terms_accepted, marketing_opt_in }) });

// Shopify Cart API — returns Shopify's hosted checkout URL.
export const createShopifyCart = (items, email) =>
  apiFetch('/shopify/cart', {
    method: 'POST',
    body: JSON.stringify({
      items: items.map(item => ({
        merchandiseId: item.shopify_variant_id,
        quantity: item.quantity,
      })),
      email,
    })
  });

export const sendContactMessage = (message) =>
  apiFetch('/contact', { method: 'POST', body: JSON.stringify(message) });

// Recommendation engine
export const getHybridRecommendation = ({ products, answers, manualWeights, aiEnabled = true, maxResults = 5 }) =>
  apiFetch('/recommendation/hybrid', {
    method: 'POST',
    body: JSON.stringify({ products, answers, manualWeights, aiEnabled, maxResults })
  });

// =====================================================
// ADMIN API
// =====================================================

// Admin login — returns JWT with role: 'admin'
export const adminLogin = (password) =>
  adminFetch('/admin/login', { method: 'POST', body: JSON.stringify({ password }) });

// Admin — Products
export const adminCreateProduct = (data) =>
  adminFetch('/products', { method: 'POST', body: JSON.stringify(data) });

export const adminUpdateProduct = (id, data) =>
  adminFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const adminDeleteProduct = (id) =>
  adminFetch(`/products/${id}`, { method: 'DELETE' });

// Admin — Recommendation weights
export const adminGetRecommendationWeights = () => adminFetch('/admin/recommendation-weights');

export const adminUpdateRecommendationWeights = (weights) =>
  adminFetch('/admin/recommendation-weights', { method: 'PUT', body: JSON.stringify({ weights }) });

// Admin — Quiz
export const adminGetQuiz = () => adminFetch('/admin/quiz');

export const adminCreateQuestion = (data) =>
  adminFetch('/admin/quiz/questions', { method: 'POST', body: JSON.stringify(data) });

export const adminUpdateQuestion = (id, data) =>
  adminFetch(`/admin/quiz/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const adminDeleteQuestion = (id) =>
  adminFetch(`/admin/quiz/questions/${id}`, { method: 'DELETE' });

export const adminCreateAnswer = (questionId, data) =>
  adminFetch(`/admin/quiz/questions/${questionId}/answers`, { method: 'POST', body: JSON.stringify(data) });

export const adminUpdateAnswer = (id, data) =>
  adminFetch(`/admin/quiz/answers/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const adminDeleteAnswer = (id) =>
  adminFetch(`/admin/quiz/answers/${id}`, { method: 'DELETE' });

// Admin — Quiz Paths
export const adminGetPaths = () => adminFetch('/admin/quiz/paths');

export const adminCreatePath = (data) =>
  adminFetch('/admin/quiz/paths', { method: 'POST', body: JSON.stringify(data) });

export const adminUpdatePath = (id, data) =>
  adminFetch(`/admin/quiz/paths/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const adminDeletePath = (id) =>
  adminFetch(`/admin/quiz/paths/${id}`, { method: 'DELETE' });

// Admin — Orders
export const adminGetOrders = () => adminFetch('/admin/orders');

export const adminGetOrder = (id) => adminFetch(`/admin/orders/${id}`);

export const adminCreatePhoneOrder = (data) =>
  adminFetch('/admin/orders', { method: 'POST', body: JSON.stringify(data) });

export const adminUpdateOrderStatus = (id, status) =>
  adminFetch(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

// Admin — Kits
export const adminCreateKit = (data) =>
  adminFetch('/kits', { method: 'POST', body: JSON.stringify(data) });

export const adminUpdateKit = (id, data) =>
  adminFetch(`/kits/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const adminDeleteKit = (id) =>
  adminFetch(`/kits/${id}`, { method: 'DELETE' });

// Admin — Kit Collections
export const adminGetKitCollections = () => adminFetch('/admin/kits/collections');
export const adminCreateKitCollection = (data) => adminFetch('/admin/kits/collections', { method: 'POST', body: JSON.stringify(data) });
export const adminUpdateKitCollection = (id, data) => adminFetch(`/admin/kits/collections/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const adminDeleteKitCollection = (id) => adminFetch(`/admin/kits/collections/${id}`, { method: 'DELETE' });

// Admin — Import from URL
export const adminImportUrl = (url) =>
  adminFetch(`/admin/import-url?url=${encodeURIComponent(url)}`);

// Admin — Image Upload (FormData, not JSON — do NOT use adminFetch here)
export const adminUploadImage = async (file) => {
  if (file.size > 4 * 1024 * 1024) {
    throw new Error('Image file is too large. Maximum size is 4 MB.');
  }

  const token = getAdminToken();
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_URL}/admin/upload-image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) removeAdminToken();
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url;
};
