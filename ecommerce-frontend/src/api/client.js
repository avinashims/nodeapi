import axios from "axios";
import { notifySessionExpired, notifySessionUpdate } from "../lib/authBridge";

const API_URL = import.meta.env.VITE_API_URL || "";

export const ACCESS_TOKEN_KEY = "accessToken";
export const USER_KEY = "user";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data && !(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

let refreshPromise = null;

export function persistSession(data) {
  if (data?.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  }
  if (data?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
  notifySessionUpdate(data);
}

export function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("token");
}

function shouldSkipRefreshRetry(config) {
  if (!config?.url) return true;
  const url = config.url;
  return (
    url.includes("/api/auth/refresh") ||
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/register") ||
    url.includes("/api/auth/logout")
  );
}

function handleAuthFailure() {
  clearAuthStorage();
  notifySessionExpired();
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/api/auth/refresh")
      .then((res) => {
        persistSession(res.data);
        return res;
      })
      .catch((err) => {
        handleAuthFailure();
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (!original || !status) {
      const message = error.message || "Request failed";
      return Promise.reject(new Error(message));
    }

    if (status === 401 && original.url?.includes("/api/auth/refresh")) {
      handleAuthFailure();
      const message = error.response?.data?.message || "Session expired";
      return Promise.reject(new Error(message));
    }

    if (status === 401 && !original._retry && !shouldSkipRefreshRetry(original)) {
      original._retry = true;
      try {
        const res = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${res.data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        const message =
          refreshError.response?.data?.message ||
          refreshError.message ||
          "Session expired";
        return Promise.reject(new Error(message));
      }
    }

    const message = error.response?.data?.message || error.message || "Request failed";
    return Promise.reject(new Error(message));
  }
);

export const authApi = {
  register: (body) => api.post("/api/auth/register", body),
  login: (body) => api.post("/api/auth/login", body),
  refresh: () => api.post("/api/auth/refresh"),
  logout: () => api.post("/api/auth/logout"),
  logoutAll: () => api.post("/api/auth/logout-all"),
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
