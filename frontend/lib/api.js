// Utility functions for calling the backend API

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Get auth token from localStorage
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

// Save token after login/register
export function saveToken(token) {
  localStorage.setItem('token', token);
}

// Remove token on logout
export function removeToken() {
  localStorage.removeItem('token');
}

// Base fetch wrapper
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Auth
export const register = (email, password, name) =>
  apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) });

export const login = (email, password) =>
  apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const getMe = () => apiFetch('/auth/me');

// Products
export const getProducts = () => apiFetch('/products');
export const getProduct = (id) => apiFetch(`/products/${id}`);

// Kits
export const getKits = () => apiFetch('/kits');
export const getKit = (id) => apiFetch(`/kits/${id}`);

// Q&A
export const getQuestions = () => apiFetch('/qa/questions');
export const getAnswers = (questionId) => apiFetch(`/qa/questions/${questionId}/answers`);
export const submitQuiz = (answers) =>
  apiFetch('/qa/submit', { method: 'POST', body: JSON.stringify({ answers }) });

// Orders — guest_email is optional (used when not logged in)
export const createOrder = (kit_id, customizations, shipping_address, guest_email) =>
  apiFetch('/orders', { method: 'POST', body: JSON.stringify({ kit_id, customizations, shipping_address, guest_email }) });

export const getOrders = () => apiFetch('/orders');

// Public order lookup — no auth needed
export const lookupOrder = (order_id) => apiFetch(`/orders/lookup/${order_id}`);

// Checkout
export const createCheckout = (order_id, success_url, cancel_url) =>
  apiFetch('/checkout', { method: 'POST', body: JSON.stringify({ order_id, success_url, cancel_url }) });
