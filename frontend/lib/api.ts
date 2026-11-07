// Typed API client for the backend.
// Use the same-origin Vercel service route by default; local development can override this URL.

import type {
  AccountOrder,
  Address,
  AdminEducationArticle,
  AdminEducationCategory,
  Answer,
  AnswerInput,
  AuthResponse,
  CheckoutResponse,
  EducationArticleInput,
  EducationCategoryInput,
  GooglePlaceDetails,
  GooglePlaceSuggestion,
  Json,
  Kit,
  KitCollection,
  KitInput,
  MessageResponse,
  Order,
  OrderItem,
  Product,
  ProductInput,
  Question,
  QuestionInput,
  QuestionWithAnswers,
  QuizPath,
  RecommendationResult,
  User,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Decode a JWT payload and check if it's expired (no signature verification — client-side only)
function jwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return !payload.exp || Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

// Get auth token from localStorage — returns null and clears if expired
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  if (token && jwtExpired(token)) {
    localStorage.removeItem('token');
    return null;
  }
  return token;
}

// Save token after login/register
export function saveToken(token: string): void {
  localStorage.setItem('token', token);
}

// Remove token on logout
export function removeToken(): void {
  localStorage.removeItem('token');
}

// Admin token (separate from user token)
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('adminToken');
  if (token && jwtExpired(token)) {
    localStorage.removeItem('adminToken');
    return null;
  }
  return token;
}

export function saveAdminToken(token: string): void {
  localStorage.setItem('adminToken', token);
}

export function removeAdminToken(): void {
  localStorage.removeItem('adminToken');
}

type ApiOptions = RequestInit & { headers?: Record<string, string> };

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) removeToken();

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Request failed (${res.status} ${res.statusText}): ${text}`);
  }
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Request failed');
  return data as T;
}

// Base fetch wrapper (uses user token)
async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  return handleResponse<T>(res);
}

// Admin fetch wrapper (uses admin token)
async function adminFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  if (res.status === 401) removeAdminToken();

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Admin request failed (${res.status} ${res.statusText}): ${text}`);
  }
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Request failed');
  return data as T;
}

// Auth
export const register = (
  email: string,
  password: string,
  name: string,
  phone_number = '',
  billing_address: Address | null = null,
  mailing_address: Address | null = null,
  next = '/account'
): Promise<AuthResponse> =>
  apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, phone_number, billing_address, mailing_address, next }),
  });

export const login = (
  email: string,
  password: string,
  rememberMe = false,
  next = '/account'
): Promise<AuthResponse> =>
  apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, rememberMe, next }) });

export const resendVerificationEmail = (email: string, next = '/account'): Promise<MessageResponse> =>
  apiFetch<MessageResponse>('/auth/email/verification/resend', { method: 'POST', body: JSON.stringify({ email, next }) });

export type VerifyEmailResponse = MessageResponse & { token?: string };

export const verifyEmail = (token: string): Promise<VerifyEmailResponse> =>
  apiFetch<VerifyEmailResponse>('/auth/email/verify', { method: 'POST', body: JSON.stringify({ token }) });

export const requestPasswordReset = (email: string, next = '/account'): Promise<MessageResponse> =>
  apiFetch<MessageResponse>('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email, next }) });

export const completePasswordReset = (token: string, password: string): Promise<MessageResponse> =>
  apiFetch<MessageResponse>('/auth/password-reset/complete', { method: 'POST', body: JSON.stringify({ token, password }) });

export const getMe = (): Promise<User> => apiFetch<User>('/auth/me');

// The profile endpoint can return the updated user plus email-verification
// flags when the email address was changed.
export type UpdatedProfile = User & { email_verification_required?: boolean; email_sent?: boolean };

export const updateProfile = (updates: Partial<User>): Promise<UpdatedProfile> =>
  apiFetch<UpdatedProfile>('/auth/profile', { method: 'PUT', body: JSON.stringify(updates) });

// Products
export const getProducts = (): Promise<Product[]> => apiFetch<Product[]>('/products');
export const getProduct = (id: string): Promise<Product> => apiFetch<Product>(`/products/${id}`);
export const adminGetProducts = (): Promise<Product[]> => adminFetch<Product[]>('/admin/products');

// Education
export const getEducation = (): Promise<{ categories: AdminEducationCategory[]; articles: AdminEducationArticle[] }> =>
  apiFetch('/education');
export const adminGetEducation = (): Promise<{ categories: AdminEducationCategory[]; articles: AdminEducationArticle[] }> =>
  adminFetch('/admin/education');
const eduBody = (data: unknown): ApiOptions => ({ body: JSON.stringify(data) });
export const adminCreateEducationCategory = (data: EducationCategoryInput): Promise<AdminEducationCategory> =>
  adminFetch('/admin/education/categories', { method: 'POST', ...eduBody(data) });
export const adminUpdateEducationCategory = (id: string, data: EducationCategoryInput): Promise<AdminEducationCategory> =>
  adminFetch(`/admin/education/categories/${id}`, { method: 'PUT', ...eduBody(data) });
export const adminDeleteEducationCategory = (id: string): Promise<void> =>
  adminFetch(`/admin/education/categories/${id}`, { method: 'DELETE' });
export const adminCreateEducationArticle = (data: EducationArticleInput): Promise<AdminEducationArticle> =>
  adminFetch('/admin/education/articles', { method: 'POST', ...eduBody(data) });
export const adminUpdateEducationArticle = (slug: string, data: EducationArticleInput): Promise<AdminEducationArticle> =>
  adminFetch(`/admin/education/articles/${slug}`, { method: 'PUT', ...eduBody(data) });
export const adminDeleteEducationArticle = (slug: string): Promise<void> =>
  adminFetch(`/admin/education/articles/${slug}`, { method: 'DELETE' });

// Kits
export const getKits = (): Promise<Kit[]> => apiFetch<Kit[]>('/kits');
export const getKit = (id: string): Promise<Kit> => apiFetch<Kit>(`/kits/${id}`);

// Q&A
export const getQuestions = (): Promise<Question[]> => apiFetch<Question[]>('/qa/questions');
export const getAnswers = (questionId: string): Promise<Answer[]> =>
  apiFetch<Answer[]>(`/qa/questions/${questionId}/answers`);
export const getStartQuestion = (): Promise<QuestionWithAnswers> => apiFetch<QuestionWithAnswers>('/qa/start');
export const getQuestion = (id: string): Promise<QuestionWithAnswers> => apiFetch<QuestionWithAnswers>(`/qa/questions/${id}`);
export const submitQuiz = (answers: Record<string, string>): Promise<Kit | Json> =>
  apiFetch('/qa/submit', { method: 'POST', body: JSON.stringify({ answers }) });

// Orders require an authenticated account; marketing consent is optional.
export const createOrder = (
  kit_id: string,
  customizations: Json,
  shipping_address: Address,
  shipping_country: string,
  phone_number: string,
  terms_accepted: boolean,
  marketing_opt_in: boolean
): Promise<Order> =>
  apiFetch<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify({ kit_id, customizations, shipping_address, shipping_country, phone_number, terms_accepted, marketing_opt_in }),
  });

export const getOrders = (): Promise<AccountOrder[]> => apiFetch<AccountOrder[]>('/orders');

export type LookupOrder = {
  order_id: string;
  kit_name: string;
  status: string;
  status_message: string;
  total_cents: number;
  created_at: string;
  shipped_at: string | null;
};

// Public order lookup — no auth needed; email is optional but recommended for verification
export const lookupOrder = (order_id: string, email?: string): Promise<LookupOrder> =>
  apiFetch<LookupOrder>(`/orders/lookup/${order_id}${email ? `?email=${encodeURIComponent(email)}` : ''}`);

export const autocompleteGoogleAddress = (input: string, sessionToken: string | null): Promise<{ suggestions: GooglePlaceSuggestion[] }> =>
  apiFetch('/address/google/autocomplete', {
    method: 'POST',
    body: JSON.stringify({ input, sessionToken }),
  });

export const getGoogleAddressDetails = (placeId: string, sessionToken: string | null): Promise<GooglePlaceDetails> =>
  apiFetch('/address/google/details', {
    method: 'POST',
    body: JSON.stringify({ placeId, sessionToken }),
  });

// Checkout
export const createCheckout = (order_id: string, success_url: string, cancel_url: string): Promise<CheckoutResponse> =>
  apiFetch<CheckoutResponse>('/checkout', { method: 'POST', body: JSON.stringify({ order_id, success_url, cancel_url }) });

// Cart order — creates an order from an array of CartItem objects (products and/or kits)
export type CartOrderResult = {
  order_id: string;
  total_cents: number;
  merchandise_subtotal_cents: number;
  shipping_cents: number;
  items: OrderItem[];
  message: string;
};

export const createCartOrder = (
  items: unknown[],
  shipping_address: Address | string,
  shipping_country: string,
  phone_number: string,
  terms_accepted: boolean,
  marketing_opt_in: boolean
): Promise<CartOrderResult> =>
  apiFetch<CartOrderResult>('/orders/from-cart', {
    method: 'POST',
    body: JSON.stringify({ items, shipping_address, shipping_country, phone_number, terms_accepted, marketing_opt_in }),
  });

// Shopify Cart API — returns Shopify's hosted checkout URL.
export const createShopifyCart = (
  items: { shopify_variant_id: string; quantity: number }[],
  email?: string
): Promise<{ url: string }> =>
  apiFetch('/shopify/cart', {
    method: 'POST',
    body: JSON.stringify({
      items: items.map((item) => ({
        merchandiseId: item.shopify_variant_id,
        quantity: item.quantity,
      })),
      email,
    }),
  });

export type ContactMessage = {
  name: string;
  email: string;
  message: string;
  [key: string]: string;
};

export const sendContactMessage = (message: ContactMessage): Promise<MessageResponse> =>
  apiFetch<MessageResponse>('/contact', { method: 'POST', body: JSON.stringify(message) });

// Recommendation engine
export const getHybridRecommendation = ({
  products,
  answers,
  manualWeights,
  aiEnabled = true,
  maxResults = 5,
}: {
  products: Product[];
  answers: Record<string, string>;
  manualWeights?: Record<string, number>;
  aiEnabled?: boolean;
  maxResults?: number;
}): Promise<RecommendationResult[]> =>
  apiFetch('/recommendation/hybrid', {
    method: 'POST',
    body: JSON.stringify({ products, answers, manualWeights, aiEnabled, maxResults }),
  });

// =====================================================
// ADMIN API
// =====================================================

// Admin login — returns JWT with role: 'admin'
export const adminLogin = (password: string): Promise<{ token: string }> =>
  adminFetch('/admin/login', { method: 'POST', body: JSON.stringify({ password }) });

// Admin — Products
export const adminCreateProduct = (data: ProductInput): Promise<Product> =>
  adminFetch('/products', { method: 'POST', ...eduBody(data) });

export const adminUpdateProduct = (id: string, data: ProductInput): Promise<Product> =>
  adminFetch(`/products/${id}`, { method: 'PUT', ...eduBody(data) });

export const adminDeleteProduct = (id: string): Promise<void> =>
  adminFetch(`/products/${id}`, { method: 'DELETE' });

// Admin — Recommendation weights
export const adminGetRecommendationWeights = (): Promise<Record<string, Record<string, number>>> =>
  adminFetch('/admin/recommendation-weights');

export const adminUpdateRecommendationWeights = (weights: Record<string, Record<string, number>>): Promise<void> =>
  adminFetch('/admin/recommendation-weights', { method: 'PUT', ...eduBody({ weights }) });

// Admin — Quiz
export const adminGetQuiz = (): Promise<QuestionWithAnswers[]> => adminFetch('/admin/quiz');

export const adminCreateQuestion = (data: QuestionInput): Promise<Question> =>
  adminFetch('/admin/quiz/questions', { method: 'POST', ...eduBody(data) });

export const adminUpdateQuestion = (id: string, data: QuestionInput): Promise<Question> =>
  adminFetch(`/admin/quiz/questions/${id}`, { method: 'PUT', ...eduBody(data) });

export const adminDeleteQuestion = (id: string): Promise<void> =>
  adminFetch(`/admin/quiz/questions/${id}`, { method: 'DELETE' });

export const adminCreateAnswer = (questionId: string, data: AnswerInput): Promise<Answer> =>
  adminFetch(`/admin/quiz/questions/${questionId}/answers`, { method: 'POST', ...eduBody(data) });

export const adminUpdateAnswer = (id: string, data: AnswerInput): Promise<Answer> =>
  adminFetch(`/admin/quiz/answers/${id}`, { method: 'PUT', ...eduBody(data) });

export const adminDeleteAnswer = (id: string): Promise<void> =>
  adminFetch(`/admin/quiz/answers/${id}`, { method: 'DELETE' });

// Admin — Quiz Paths
export const adminGetPaths = (): Promise<QuizPath[]> => adminFetch('/admin/quiz/paths');

export const adminCreatePath = (data: { name: string }): Promise<QuizPath> =>
  adminFetch('/admin/quiz/paths', { method: 'POST', ...eduBody(data) });

export const adminUpdatePath = (id: string, data: { name: string }): Promise<QuizPath> =>
  adminFetch(`/admin/quiz/paths/${id}`, { method: 'PUT', ...eduBody(data) });

export const adminDeletePath = (id: string): Promise<void> =>
  adminFetch(`/admin/quiz/paths/${id}`, { method: 'DELETE' });

// Admin — Orders
export const adminGetOrders = (): Promise<Order[]> => adminFetch('/admin/orders');

export const adminGetOrder = (id: string): Promise<Order> => adminFetch(`/admin/orders/${id}`);

export type PhoneOrderResult = {
  order_id: string;
  payment_url: string;
  total_cents: number;
  expires_at: string;
};

export const adminCreatePhoneOrder = (data: Record<string, Json>): Promise<PhoneOrderResult> =>
  adminFetch('/admin/orders', { method: 'POST', ...eduBody(data) });

export const adminUpdateOrderStatus = (id: string, status: string): Promise<Order> =>
  adminFetch(`/admin/orders/${id}/status`, { method: 'PATCH', ...eduBody({ status }) });

// Admin — Kits
export const adminCreateKit = (data: KitInput): Promise<Kit> =>
  adminFetch('/kits', { method: 'POST', ...eduBody(data) });

export const adminUpdateKit = (id: string, data: KitInput): Promise<Kit> =>
  adminFetch(`/kits/${id}`, { method: 'PUT', ...eduBody(data) });

export const adminDeleteKit = (id: string): Promise<void> =>
  adminFetch(`/kits/${id}`, { method: 'DELETE' });

// Admin — Kit Collections
export const adminGetKitCollections = (): Promise<KitCollection[]> => adminFetch('/admin/kits/collections');
export const adminCreateKitCollection = (data: { name: string }): Promise<KitCollection> =>
  adminFetch('/admin/kits/collections', { method: 'POST', ...eduBody(data) });
export const adminUpdateKitCollection = (id: string, data: { name: string }): Promise<KitCollection> =>
  adminFetch(`/admin/kits/collections/${id}`, { method: 'PUT', ...eduBody(data) });
export const adminDeleteKitCollection = (id: string): Promise<void> =>
  adminFetch(`/admin/kits/collections/${id}`, { method: 'DELETE' });

// Admin — Import from URL
export const adminImportUrl = (url: string): Promise<{ product: Partial<Product> }> =>
  adminFetch(`/admin/import-url?url=${encodeURIComponent(url)}`);

// Admin — Image Upload (FormData, not JSON — do NOT use adminFetch here)
export const adminUploadImage = async (file: File): Promise<string> => {
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
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url as string;
};
