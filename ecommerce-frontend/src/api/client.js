import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

export const ACCESS_TOKEN_KEY = "accessToken";
export const USER_KEY = "user";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

function getToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveSession(data) {
  if (data?.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  }
  if (data?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
  window.dispatchEvent(new CustomEvent("auth:update", { detail: data }));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("auth:expired"));
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data && !(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

let refreshing = null;

const skipRefreshUrls = ["/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/auth/logout"];

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || "Request failed";

    if (!config || status !== 401) {
      return Promise.reject(new Error(message));
    }

    if (config.url?.includes("/api/auth/refresh")) {
      clearSession();
      return Promise.reject(new Error(message));
    }

    const isAuthRoute = skipRefreshUrls.some((url) => config.url?.includes(url));
    if (isAuthRoute || config._retry) {
      return Promise.reject(new Error(message));
    }

    config._retry = true;

    try {
      if (!refreshing) {
        refreshing = api.post("/api/auth/refresh").finally(() => {
          refreshing = null;
        });
      }
      const res = await refreshing;
      saveSession(res.data);
      config.headers.Authorization = `Bearer ${res.data.accessToken}`;
      return api(config);
    } catch {
      clearSession();
      return Promise.reject(new Error("Session expired"));
    }
  }
);

export const authApi = {
  login: (body) => api.post("/api/auth/login", body),
  register: (body) => api.post("/api/auth/register", body),
  refresh: () => api.post("/api/auth/refresh"),
  logout: () => api.post("/api/auth/logout"),
  me: () => api.get("/api/auth/me"),
};

export const productApi = {
  list: (params) => api.get("/api/products", { params }),
  get: (id) => api.get(`/api/products/${id}`),
  create: (formData) => api.post("/api/products", formData),
  update: (id, formData) => api.put(`/api/products/${id}`, formData),
  remove: (id) => api.delete(`/api/products/${id}`),
};

export const categoryApi = {
  list: () => api.get("/api/categories"),
  create: (body) => api.post("/api/categories", body),
  update: (id, body) => api.put(`/api/categories/${id}`, body),
  remove: (id) => api.delete(`/api/categories/${id}`),
};

export const cartApi = {
  get: () => api.get("/api/cart"),
  add: (body) => api.post("/api/cart", body),
  update: (productId, body) => api.put(`/api/cart/${productId}`, body),
  remove: (productId) => api.delete(`/api/cart/${productId}`),
  clear: () => api.delete("/api/cart"),
};

export const checkoutApi = {
  createOrder: (body) => api.post("/api/checkout", body),
};

export const paymentApi = {
  createRazorpayOrder: (body) => api.post("/api/payments/create-order", body),
  verify: (body) => api.post("/api/payments/verify", body),
};

export const orderApi = {
  myOrders: (params) => api.get("/api/orders/my", { params }),
  get: (id) => api.get(`/api/orders/${id}`),
  cancel: (id) => api.put(`/api/orders/${id}/cancel`),
  adminAll: (params) => api.get("/api/orders/admin/all", { params }),
  updateStatus: (id, body) => api.put(`/api/orders/${id}/status`, body),
};

export const dashboardApi = {
  customer: () => api.get("/api/dashboard"),
  admin: () => api.get("/api/dashboard/admin"),
};

export function formatPrice(value) {
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (Number.isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);
}

export function formatPaymentMethod(method) {
  if (method === "COD") return "Cash on delivery";
  if (method === "RAZORPAY") return "Online (Razorpay)";
  return method || "—";
}

export function resolveProductImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  const base = API_URL.replace(/\/$/, "");
  return `${base}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}
